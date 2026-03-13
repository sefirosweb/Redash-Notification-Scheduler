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
            job_exec = redash.execute_query(job.query_id)
            print(f"[job_runner] Query lanzada, job redash id={job_exec['id']}", flush=True)
            job_poll = redash.poll_job(job_exec['id'])
            result = redash.get_query_result(job_poll['query_result_id'])
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
