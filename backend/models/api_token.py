from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class ApiToken(Base):
    __tablename__ = "api_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    token_hash = Column(String, unique=True, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)   # None = indefinite
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
