from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.job import EmailLog, Job
from pydantic import BaseModel
from typing import List

router = APIRouter()

class LogOut(BaseModel):
	id: int
	job_id: int
	job_name: str
	status: str
	recipients: str
	error_msg: str | None = None
	executed_at: str

	class Config:
		from_attributes = True

@router.get("/", response_model=List[LogOut])
def list_logs(db: Session = Depends(get_db)):
	logs = db.query(EmailLog).order_by(EmailLog.executed_at.desc()).all()
	return [LogOut(
		id=log.id,
		job_id=log.job_id,
		job_name=log.job.name if log.job else None,
		status=log.status,
		recipients=log.recipients,
		error_msg=log.error_msg,
		executed_at=log.executed_at.isoformat()
	) for log in logs]

@router.get("/{log_id}", response_model=LogOut)
def get_log(log_id: int, db: Session = Depends(get_db)):
	log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
	if not log:
		raise HTTPException(status_code=404, detail="Log not found")
	return LogOut(
		id=log.id,
		job_id=log.job_id,
		job_name=log.job.name if log.job else None,
		status=log.status,
		recipients=log.recipients,
		error_msg=log.error_msg,
		executed_at=log.executed_at.isoformat()
	)
