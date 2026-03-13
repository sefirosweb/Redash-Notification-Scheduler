from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
from routers import jobs, groups, config, auth, logs, users, redash_proxy
from services.scheduler import start_scheduler

Base.metadata.create_all(bind=engine)

def _run_migrations():
    """Aplica migraciones de columnas nuevas sobre BD existente."""
    with engine.connect() as conn:
        from sqlalchemy import text
        migrations = [
            "ALTER TABLE jobs ADD COLUMN body TEXT",
            "ALTER TABLE jobs ADD COLUMN parameters TEXT",
        ]
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # La columna ya existe

_run_migrations()

app = FastAPI(title="Redash Mailer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,   prefix="/api/auth",   tags=["auth"])
app.include_router(users.router,  prefix="/api/users",  tags=["users"])
app.include_router(jobs.router,   prefix="/api/jobs",   tags=["jobs"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(logs.router,   prefix="/api/logs",   tags=["logs"])
app.include_router(redash_proxy.router, prefix="/api/redash", tags=["redash"])

@app.on_event("startup")
def startup():
    _seed_admin()
    start_scheduler()

def _seed_admin():
    from models.user import User
    from passlib.context import CryptContext
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
            db.add(User(
                username="admin",
                password_hash=pwd.hash("admin"),
                is_active=True,
                is_admin=True,
            ))
            db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
