# Redash Notification Scheduler

A self-hosted web application to schedule and send automated email reports from [Redash](https://redash.io/) queries. Configure jobs with cron expressions, choose your output format (HTML, PDF, or Excel), and deliver reports to recipient groups automatically.

Built with FastAPI + React. Fully Dockerized.

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## Screenshots

| Jobs editor | API Tokens | Recipient groups |
|-------------|------------|-----------------|
| ![Jobs editor](docs/screenshots/image-1.png) | ![API Tokens](docs/screenshots/image-2.png) | ![Groups](docs/screenshots/image-3.png) |

---

## Features

- **Scheduled jobs** — define cron expressions to send reports automatically
- **Force run** — trigger any job immediately without waiting for the schedule
- **Multiple formats** — send reports as inline HTML, PDF attachment, or Excel attachment
- **Recipient groups** — manage lists of email addresses and assign them to jobs
- **Dynamic parameters** — supports all Redash parameter types (`text`, `number`, `date`, `date-range`, `enum`, `query`)
- **Intro text** — add a custom description before each report in the email body
- **Execution history** — view logs of every sent email with status and error details
- **User management** — create and manage users with active/inactive status
- **Authentication** — JWT-based login, protected routes
- **API Tokens** — long-lived tokens for external system integration
- **Real-time query API** — execute any Redash query on demand and get fresh data instantly

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python 3.11, FastAPI, SQLAlchemy  |
| Database  | SQLite (via Docker volume)        |
| Scheduler | APScheduler                       |
| PDF       | ReportLab                         |
| Excel     | openpyxl                          |
| Frontend  | React 18, Vite, Tailwind CSS      |
| Proxy     | Nginx                             |
| Deploy    | Docker + docker-compose           |

---

## Getting Started

### Option A — Pre-built image (recommended)

No need to install Node or Python. Just pull and run.

**1. Create your `.env`:**

```env
REDASH_URL=https://your-redash-instance.com
REDASH_API_KEY=your_redash_api_key

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@email.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@yourcompany.com

JWT_SECRET=change_this_to_a_random_secret_min32chars

TIMEZONE=Europe/Madrid
```

**2. Run with Docker Compose:**

```yaml
# docker-compose.yml
services:
  app:
    image: ghcr.io/sefirosweb/redash-notification-scheduler:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - "80:80"
    volumes:
      - sqlite_data:/app/data

volumes:
  sqlite_data:
```

```bash
docker compose up -d
```

Or directly with Docker:

```bash
docker run -d --name redash-scheduler \
  --env-file .env \
  -p 80:80 \
  -v redash-data:/app/data \
  --restart unless-stopped \
  ghcr.io/sefirosweb/redash-notification-scheduler:latest
```

The app will be available at [http://localhost](http://localhost).

On first startup, an admin user is created automatically:

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

**Change the password after first login.**

---

### Option B — Build from source (development)

```bash
git clone https://github.com/sefirosweb/Redash-Notification-Scheduler.git
cd Redash-Notification-Scheduler
cp .env.example .env
# Edit .env with your values
docker compose up -d --build
```

The development `docker-compose.yml` builds frontend and backend separately and mounts the backend source for hot-reload.

---

## Usage

### Creating a job

1. Go to **Jobs** → **Crear Job**
2. Fill in:
   - **Name** — descriptive label for the job
   - **Query ID** — the numeric ID of your Redash query (visible in the query URL)
   - **Cron expression** — e.g. `0 8 * * 1` for every Monday at 8:00 AM
   - **Format** — HTML (inline), PDF (attachment), or Excel (attachment)
   - **Recipient group** — select a group of email addresses
   - **Intro text** *(optional)* — description shown before the report content
3. Save and use the ▶ button to test immediately

### Cron expression reference

| Expression      | Meaning                     |
|-----------------|-----------------------------|
| `0 8 * * 1`     | Every Monday at 08:00       |
| `0 9 * * 1-5`   | Weekdays at 09:00           |
| `0 7 1 * *`     | 1st of every month at 07:00 |
| `30 6 * * *`    | Every day at 06:30          |

### Managing recipient groups

Go to **Grupos** → **Crear Grupo**. Enter a name and a comma-separated list of email addresses:

```
ana@company.com, luis@company.com, team@company.com
```

---

## Real-time Query API

Execute Redash queries on demand from any external system (ERP, scripts, dashboards) and get fresh data without waiting for the scheduler.

### 1. Create an API Token

In the web UI → **API Tokens** → **Crear Token**.
Give it a name and an optional expiry date. The raw token (`rns_...`) is shown **only once** — copy it immediately.

### 2. Execute a query

```bash
curl -X POST https://your-server/api/redash/queries/{query_id}/execute \
  -H "Authorization: Bearer rns_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "max_age": 0,
    "parameters": {
      "fecha":     { "start": "2025-01-01", "end": "2025-03-31" },
      "proveedor": "Acme S.A."
    }
  }'
```

| Field | Description |
|-------|-------------|
| `max_age` | Cache in seconds. `0` = always fresh (default). Use a higher value to allow Redash to return cached results. |
| `parameters` | Optional. Simple value: `"param": "value"`. Date range: `"param": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}`. |

**Success (200):** array of row objects.

**Parameter error (400):** includes `redash_error` (Redash's own message) and `expected_parameters` with each parameter's type, format hint, and — for `query`-type parameters — the list of valid values fetched live:

```json
{
  "detail": {
    "redash_error": { "message": "The following parameter values are incompatible: proveedor" },
    "expected_parameters": [
      { "name": "fecha",     "type": "date-range", "hint": "{\"start\": \"YYYY-MM-DD\", \"end\": \"YYYY-MM-DD\"}" },
      { "name": "proveedor", "type": "query",       "allowed_values": ["Acme S.A.", "Proveedor B", "..."] }
    ]
  }
}
```

### Token management endpoints

All require a valid JWT login token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/api-tokens/`     | List all tokens |
| `POST`   | `/api/api-tokens/`     | Create a token (`{"name": "...", "expires_at": "..."}`) |
| `DELETE` | `/api/api-tokens/{id}` | Revoke a token |

---

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app entry point, migrations, scheduler start
│   ├── database.py          # SQLAlchemy setup
│   ├── models/
│   │   ├── job.py           # Job, Group, EmailLog
│   │   ├── user.py          # User
│   │   └── api_token.py     # ApiToken (external access tokens)
│   ├── routers/
│   │   ├── auth.py          # Login + JWT middleware
│   │   ├── jobs.py          # CRUD jobs + force run
│   │   ├── groups.py        # CRUD recipient groups
│   │   ├── users.py         # CRUD users
│   │   ├── logs.py          # Execution history
│   │   ├── redash_proxy.py  # Redash query proxy + real-time execute endpoint
│   │   └── api_tokens.py    # API token CRUD + auth dependency
│   └── services/
│       ├── scheduler.py     # APScheduler + job runner + parameter resolver
│       ├── mailer.py        # SMTP email sender
│       ├── redash.py        # Redash API client
│       └── formatters.py    # HTML / PDF / Excel generators
├── frontend/
│   └── src/
│       ├── pages/           # Jobs, Groups, Logs, Users, ApiTokens, Login
│       └── components/      # JobForm (with searchable dropdowns), UI components
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.

Made by [sefirosweb](https://github.com/sefirosweb)
