from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import sessionmaker
from database import engine
from models.job import Job, Group
from services.redash import RedashClient
from services.mailer import Mailer
from services.formatters import rows_to_html, rows_to_pdf, rows_to_excel
from models.job import EmailLog
import os
import pytz

_tz = pytz.timezone(os.getenv("TIMEZONE", "Europe/Madrid"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
scheduler = BackgroundScheduler(timezone=_tz)

def warm_query_type_params(parameters_json, redash: "RedashClient"):
    """Pre-warm Redash cache for source queries of query-type parameters.
    This ensures validation succeeds when the main query runs with max_age=0."""
    import json
    try:
        params = json.loads(parameters_json) if parameters_json else {}
    except Exception:
        return
    for cfg in params.values():
        if cfg.get('type') == 'query' and cfg.get('queryId'):
            try:
                job_exec = redash.execute_query(int(cfg['queryId']), max_age=86400)
                if not job_exec.get('_cached'):
                    redash.poll_job(job_exec['id'])
            except Exception:
                pass  # best-effort — don't block the main execution


def resolve_parameters(parameters_json):
    if not parameters_json:
        return None
    import json
    from datetime import date, timedelta
    today = date.today()
    fom = today.replace(day=1)
    lme = fom - timedelta(days=1)
    lms = lme.replace(day=1)
    PRESETS = {
        'today':        (today, today),
        'yesterday':    (today - timedelta(1), today - timedelta(1)),
        'last_7_days':  (today - timedelta(7), today),
        'last_30_days': (today - timedelta(30), today),
        'last_90_days': (today - timedelta(90), today),
        'this_month':   (fom, today),
        'last_month':   (lms, lme),
        'this_year':    (today.replace(month=1, day=1), today),
    }
    try:
        params = json.loads(parameters_json)
    except Exception:
        return None
    resolved = {}
    for key, cfg in params.items():
        ptype = cfg.get('type', 'text')
        value = cfg.get('value', '')
        is_preset = cfg.get('is_preset', False)
        if is_preset and value in PRESETS:
            start, end = PRESETS[value]
            if ptype in ('date-range', 'datetime-range', 'datetime-range-with-seconds'):
                resolved[key] = {'start': start.isoformat(), 'end': end.isoformat()}
            else:
                resolved[key] = end.isoformat()
        else:
            # query-type params in Redash are always sent as arrays
            if ptype == 'query':
                if isinstance(value, list):
                    resolved[key] = value if value else None
                else:
                    resolved[key] = [value] if value not in (None, '') else None
            else:
                if ptype == 'enum' and isinstance(value, list):
                    resolved[key] = value if value else None
                elif ptype == 'number' and value not in (None, ''):
                    try:
                        resolved[key] = float(value) if '.' in str(value) else int(value)
                    except (ValueError, TypeError):
                        resolved[key] = value
                else:
                    resolved[key] = value
    return resolved if resolved else None


def job_runner(job_id):
    print(f"[job_runner] Iniciando job_id={job_id}", flush=True)
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            print(f"[job_runner] Job {job_id} no encontrado", flush=True)
            return

        redash_url     = os.getenv("REDASH_URL", "")
        redash_api_key = os.getenv("REDASH_API_KEY", "")
        smtp_server    = os.getenv("SMTP_SERVER", "")
        smtp_port      = int(os.getenv("SMTP_PORT", "587"))
        smtp_username  = os.getenv("SMTP_USERNAME", "")
        smtp_password  = os.getenv("SMTP_PASSWORD", "")
        smtp_from      = os.getenv("SMTP_FROM", "")

        if not redash_url or not redash_api_key:
            print(f"[job_runner] REDASH_URL o REDASH_API_KEY no configurados en .env", flush=True)
            log = EmailLog(job_id=job.id, status='error', recipients='', error_msg='REDASH_URL/REDASH_API_KEY no configurados')
            db.add(log); db.commit()
            return

        group = db.query(Group).filter(Group.id == job.group_id).first()
        if not group:
            print(f"[job_runner] Grupo {job.group_id} no encontrado", flush=True)
            log = EmailLog(job_id=job.id, status='error', recipients='', error_msg=f'Grupo {job.group_id} no encontrado')
            db.add(log); db.commit()
            return

        print(f"[job_runner] Ejecutando '{job.name}' → query_id={job.query_id}, destinatarios={group.emails}", flush=True)
        redash = RedashClient(redash_url, redash_api_key)
        mailer = Mailer(smtp_server, smtp_port, smtp_username, smtp_password, smtp_from)
        try:
            warm_query_type_params(job.parameters, redash)
            resolved_params = resolve_parameters(job.parameters)
            print(f"[job_runner] Parámetros resueltos: {resolved_params}", flush=True)
            job_exec = redash.execute_query(job.query_id, parameters=resolved_params, max_age=0)
            if job_exec.get("_cached"):
                print(f"[job_runner] Resultado en caché, query_result_id={job_exec['query_result_id']}", flush=True)
                query_result_id = job_exec['query_result_id']
            else:
                print(f"[job_runner] Query lanzada, job redash id={job_exec['id']}", flush=True)
                job_poll = redash.poll_job(job_exec['id'])
                query_result_id = job_poll['query_result_id']
            result = redash.get_query_result(query_result_id)
            rows = result['data']['rows']
            columns = result['data']['columns']
            print(f"[job_runner] Resultado obtenido: {len(rows)} filas", flush=True)
            pdf   = rows_to_pdf(rows, columns)   if job.format == 'pdf'   else None
            excel = rows_to_excel(rows, columns) if job.format == 'excel' else None
            # Body del email: descripción opcional + tabla solo si formato HTML
            intro = f"<p style='font-family:sans-serif;margin:0 0 16px'>{job.body}</p>" if job.body else ""
            if job.format == 'html':
                content = rows_to_html(rows, columns)
            else:
                fmt_label = 'PDF' if job.format == 'pdf' else 'Excel'
                content = f"<p style='font-family:sans-serif'>Adjunto encontrarás el reporte en formato {fmt_label} ({len(rows)} filas).</p>"
            footer = """
                <hr style='border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px'>
                <p style='font-family:sans-serif;font-size:12px;color:#94a3b8;margin:0'>
                  Sent by <a href='https://github.com/sefirosweb/Redash-Notification-Scheduler'
                    style='color:#7c3aed;text-decoration:none'>Redash Notification Scheduler</a>
                  &mdash; by <a href='https://github.com/sefirosweb' style='color:#7c3aed;text-decoration:none'>sefirosweb</a>
                </p>"""
            html_body = intro + content + footer
            mailer.send_email(
                to=[email.strip() for email in group.emails.split(',')],
                subject=f"Reporte: {job.name}",
                html_body=html_body,
                pdf_bytes=pdf,
                excel_bytes=excel
            )
            print(f"[job_runner] Email enviado correctamente", flush=True)
            status = 'ok'
            error_msg = None
        except Exception as e:
            status = 'error'
            error_msg = str(e)
            print(f"[job_runner] ERROR: {error_msg}", flush=True)

        log = EmailLog(job_id=job.id, status=status, recipients=group.emails, error_msg=error_msg)
        db.add(log)
        db.commit()
    finally:
        db.close()

def start_scheduler():
    db = SessionLocal()
    jobs = db.query(Job).filter(Job.active == True).all()
    for job in jobs:
        scheduler.add_job(
            job_runner,
            'cron',
            id=f"job_{job.id}",
            args=[job.id],
            **parse_cron(job.cron_expr)
        )
    scheduler.start()
    db.close()

def parse_cron(cron_expr):
    # cron_expr: "0 8 * * 1" → dict for APScheduler
    parts = cron_expr.split()
    return {
        'minute': parts[0],
        'hour': parts[1],
        'day': parts[2],
        'month': parts[3],
        'day_of_week': parts[4]
    }
