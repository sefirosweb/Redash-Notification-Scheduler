# Redash Notification Scheduler — Context

Herramienta interna para programar el envío automático de reportes por email a partir de queries de Redash. Sustituye la necesidad de exportar manualmente datos y distribuirlos por correo.

---

## Stack

| Capa      | Tecnología                          |
|-----------|-------------------------------------|
| Backend   | FastAPI (Python 3.11)               |
| Base de datos | SQLite (volumen Docker)         |
| Scheduler | APScheduler                         |
| PDF       | ReportLab                           |
| Excel     | openpyxl                            |
| Email     | smtplib (STARTTLS)                  |
| Frontend  | React 18 + Vite + Tailwind CSS      |
| UI        | Componentes estilo shadcn/ui        |
| Toasts    | sonner                              |
| Auth      | JWT (python-jose) + passlib/bcrypt  |
| Proxy     | Nginx                               |
| Deploy    | Docker + docker-compose             |

---

## Funcionalidades implementadas

### Jobs
- Listado, creación, edición y eliminación
- Campos: nombre, query_id, cron_expr, formato (html/pdf/excel), grupo de destinatarios, texto introductorio (body), activo/inactivo
- Botón de ejecución forzada (sin esperar al cron)
- Expresión cron parseada con cronstrue en la UI

### Grupos de destinatarios
- Listado, creación, edición y eliminación
- Emails separados por coma

### Historial (Logs)
- Registro de cada ejecución: job, estado (ok/error), destinatarios, mensaje de error, fecha
- Ordenado de más reciente a más antiguo

### Usuarios
- Listado, creación, edición y eliminación
- Campos: username, password, is_active
- Primer usuario creado automáticamente (admin/admin) al arrancar si no hay ninguno

### Autenticación
- Login con usuario y contraseña → JWT en localStorage
- Rutas protegidas en frontend
- Middleware de autorización en backend

### API Tokens
- Gestión de tokens para acceso externo desde sistemas de terceros (ERP, scripts, etc.)
- Cada token tiene: nombre, creador, fecha de expiración opcional (null = indefinido)
- El token raw (`rns_` + 32 hex) se muestra solo una vez al crear; en BD se guarda el hash SHA-256
- Endpoints protegidos por JWT (gestión) o por API token (ejecución de queries)

### API de ejecución en tiempo real
- `POST /api/redash/queries/{query_id}/execute`
- Requiere cabecera `Authorization: Bearer rns_...` (API token)
- Fuerza ejecución fresca en Redash (`max_age=0` por defecto), espera el resultado y devuelve las filas
- Soporta `max_age` configurable (en segundos) para permitir caché si se desea
- Parámetros en formato simplificado, pasados directamente a Redash:
  - Valor simple: `"param": "valor"`
  - Rango de fechas: `"param": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}`
- En caso de error de parámetros (400), la respuesta incluye:
  - `redash_error`: mensaje original de Redash
  - `expected_parameters`: lista de parámetros con sus tipos y valores permitidos (para parámetros de tipo `query`, incluye los valores disponibles obtenidos en tiempo real)

### Email
- Formato HTML: tabla inline en el body
- Formato PDF: tabla generada con ReportLab, enviada como adjunto
- Formato Excel: fichero .xlsx generado con openpyxl, enviado como adjunto
- Footer con enlace al proyecto en todos los emails

---

## Configuración

Toda la configuración se hace vía variables de entorno en `.env`. No hay UI de configuración.

```env
# Redash
REDASH_URL=https://redash.tuempresa.com
REDASH_API_KEY=tu_api_key

# SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=usuario@empresa.com
SMTP_PASSWORD=contraseña
SMTP_FROM=noreply@empresa.com

# Auth
JWT_SECRET=secreto_minimo_32_caracteres
```

---

## Arquitectura

```
docker-compose
├── backend   (FastAPI, puerto 8000, interno)
├── frontend  (Nginx sirviendo React build, puerto 80 interno)
└── nginx     (reverse proxy público, puerto 80)
              /api/*  → backend:8000
              /*      → frontend:80
```

### Base de datos (SQLite)

Tablas:
- `users` — usuarios de la aplicación
- `groups` — grupos de destinatarios
- `jobs` — jobs programados
- `email_logs` — historial de ejecuciones
- `api_tokens` — tokens de acceso externo (hash SHA-256, expiración opcional)
- `global_config` — tabla legacy (no se usa, config viene del .env)

### Migraciones

No se usa Alembic. Las columnas nuevas se añaden en `_run_migrations()` en `main.py` con `ALTER TABLE ... ADD COLUMN` idempotente (ignora errores si la columna ya existe).

---

## Flujo de ejecución de un job

1. APScheduler dispara `job_runner(job_id)` según el cron
2. Lee variables de entorno para Redash y SMTP
3. Llama a la API de Redash: ejecuta la query y hace polling hasta obtener resultado
4. Genera el contenido según formato (HTML / PDF / Excel)
5. Envía el email con smtplib STARTTLS
6. Guarda un registro en `email_logs` con el resultado

---

## Estructura de ficheros

```
backend/
├── main.py                  # Entry point, migraciones, seed admin, arranque scheduler
├── database.py              # SQLAlchemy engine + SessionLocal
├── models/
│   ├── job.py               # Job, Group, EmailLog, GlobalConfig
│   ├── user.py              # User
│   └── api_token.py         # ApiToken (tokens de acceso externo)
├── routers/
│   ├── auth.py              # POST /login, get_current_user, require_admin
│   ├── jobs.py              # CRUD jobs + POST /{id}/run
│   ├── groups.py            # CRUD grupos (409 si tiene jobs asociados)
│   ├── logs.py              # GET logs
│   ├── users.py             # CRUD usuarios
│   ├── config.py            # GET/PUT config (legacy, no se usa en producción)
│   ├── redash_proxy.py      # Proxy queries Redash + POST /execute (tiempo real)
│   └── api_tokens.py        # CRUD tokens + dependency require_api_token
└── services/
    ├── scheduler.py         # APScheduler + job_runner + resolve_parameters
    ├── mailer.py            # Envío SMTP
    ├── redash.py            # Cliente API Redash (execute_query, poll_job, etc.)
    └── formatters.py        # rows_to_html / rows_to_pdf / rows_to_excel

frontend/src/
├── App.jsx                  # Router, Sidebar, ProtectedRoute, Layout
├── api/client.js            # axios con interceptor Bearer token
├── pages/
│   ├── Login.jsx
│   ├── Jobs.jsx
│   ├── Groups.jsx
│   ├── Logs.jsx
│   ├── Users.jsx
│   └── ApiTokens.jsx        # Gestión de tokens + guía de uso del endpoint
└── components/
    ├── JobForm.jsx           # SearchableSelect, QueryPicker, parámetros dinámicos
    └── ui/                  # button, input, label, select, badge, card, table
```
