from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Group(Base):
    __tablename__ = "groups"
    id      = Column(Integer, primary_key=True, index=True)
    name    = Column(String, unique=True, nullable=False)
    emails  = Column(Text, nullable=False)  # JSON array string
    jobs    = relationship("Job", back_populates="group")


class Job(Base):
    __tablename__ = "jobs"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    query_id    = Column(Integer, nullable=False)
    cron_expr   = Column(String, nullable=False)   # e.g. "0 8 * * 1"
    format      = Column(String, nullable=False)   # html | pdf | excel
    body        = Column(Text, nullable=True)      # intro text before table
    parameters  = Column(Text, nullable=True)      # JSON: {param_name: {type, value, is_preset}}
    active      = Column(Boolean, default=True)
    group_id    = Column(Integer, ForeignKey("groups.id"), nullable=False)
    group       = relationship("Group", back_populates="jobs")
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    logs        = relationship("EmailLog", back_populates="job", cascade="all, delete-orphan")


class EmailLog(Base):
    __tablename__ = "email_logs"
    id          = Column(Integer, primary_key=True, index=True)
    job_id      = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    job         = relationship("Job", back_populates="logs")
    status      = Column(String, nullable=False)   # ok | error
    recipients  = Column(Text)                     # JSON array
    error_msg   = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)


class GlobalConfig(Base):
    __tablename__ = "global_config"
    id              = Column(Integer, primary_key=True, default=1)
    redash_url      = Column(String)
    redash_api_key  = Column(String)
    smtp_server     = Column(String)
    smtp_port       = Column(Integer, default=587)
    smtp_username   = Column(String)
    smtp_password   = Column(String)
    smtp_from       = Column(String)
