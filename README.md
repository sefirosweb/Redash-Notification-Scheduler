# Redash Notification Scheduler

A self-hosted web application to schedule and send automated email reports from [Redash](https://redash.io/) queries. Configure jobs with cron expressions, choose your output format (HTML, PDF, or Excel), and deliver reports to recipient groups automatically.

Built with FastAPI + React. Fully Dockerized.

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## Features

- **Scheduled jobs** — define cron expressions to send reports automatically
- **Force run** — trigger any job immediately without waiting for the schedule
- **Multiple formats** — send reports as inline HTML, PDF attachment, or Excel attachment
- **Recipient groups** — manage lists of email addresses and assign them to jobs
- **Intro text** — add a custom description before each report in the email body
- **Execution history** — view logs of every sent email with status and error details
- **User management** — create and manage users with admin roles
- **Authentication** — JWT-based login, protected routes

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

### Prerequisites

- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/sefirosweb/Redash-Notification-Scheduler.git
cd Redash-Notification-Scheduler
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Redash
REDASH_URL=https://your-redash-instance.com
REDASH_API_KEY=your_redash_api_key

# SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@email.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@yourcompany.com

# Auth
JWT_SECRET=change_this_to_a_random_secret_min32chars
```

### 3. Start the application

```bash
docker-compose up -d --build
```

The app will be available at [http://localhost](http://localhost).

### 4. Default credentials

On first startup, an admin user is created automatically:

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

**Change the password after first login.**

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

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy setup
│   ├── models/              # ORM models (Job, Group, EmailLog, User)
│   ├── routers/             # API endpoints
│   └── services/
│       ├── scheduler.py     # APScheduler + job runner
│       ├── mailer.py        # SMTP email sender
│       ├── redash.py        # Redash API client
│       └── formatters.py    # HTML / PDF / Excel generators
├── frontend/
│   └── src/
│       ├── pages/           # Jobs, Groups, Logs, Users, Login
│       └── components/      # JobForm, shadcn-style UI components
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.

Made by [sefirosweb](https://github.com/sefirosweb)
