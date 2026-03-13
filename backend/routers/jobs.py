from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.job import Job
from pydantic import BaseModel

router = APIRouter()

class JobCreate(BaseModel):
    name: str
    query_id: int
    cron_expr: str
    format: str
    body: Optional[str] = None
    parameters: Optional[str] = None
    active: bool = True
    group_id: int

class JobOut(JobCreate):
    id: int
    class Config:
        from_attributes = True

class JobUpdate(BaseModel):
    name: str = None
    query_id: int = None
    cron_expr: str = None
    format: str = None
    body: Optional[str] = None
    parameters: Optional[str] = None
    active: bool = None
    group_id: int = None

@router.get("/", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()

@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/", response_model=JobOut)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    db_job = Job(**job.dict())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.put("/{job_id}", response_model=JobOut)
def update_job(job_id: int, job: JobUpdate, db: Session = Depends(get_db)):
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    for key, value in job.dict(exclude_unset=True).items():
        setattr(db_job, key, value)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.post("/{job_id}/run")
def run_job_now(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    from services.scheduler import job_runner
    import threading
    threading.Thread(target=job_runner, args=(job_id,), daemon=True).start()
    return {"ok": True, "message": f"Job '{job.name}' lanzado en segundo plano"}

@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(db_job)
    db.commit()
    return {"ok": True}
