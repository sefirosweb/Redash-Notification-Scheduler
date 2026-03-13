from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.job import GlobalConfig
from pydantic import BaseModel

router = APIRouter()

class ConfigUpdate(BaseModel):
    redash_url: str = None
    redash_api_key: str = None
    smtp_server: str = None
    smtp_port: int = None
    smtp_username: str = None
    smtp_password: str = None
    smtp_from: str = None

@router.get("/", response_model=ConfigUpdate)
def get_config(db: Session = Depends(get_db)):
    config = db.query(GlobalConfig).filter(GlobalConfig.id == 1).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return config

@router.put("/", response_model=ConfigUpdate)
def update_config(cfg: ConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(GlobalConfig).filter(GlobalConfig.id == 1).first()
    if not config:
        config = GlobalConfig(id=1)
        db.add(config)
    for key, value in cfg.dict(exclude_unset=True).items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config
