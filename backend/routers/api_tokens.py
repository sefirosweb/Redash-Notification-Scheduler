import hashlib
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.api_token import ApiToken
from routers.auth import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TokenCreate(BaseModel):
    name: str
    expires_at: Optional[datetime] = None


class TokenOut(BaseModel):
    id: int
    name: str
    created_by: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TokenCreated(TokenOut):
    token: str   # raw token — shown only once


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _make_token() -> str:
    return "rns_" + os.urandom(16).hex()


def _to_out(t: ApiToken) -> dict:
    return {
        "id":         t.id,
        "name":       t.name,
        "created_by": t.user.username if t.user else None,
        "expires_at": t.expires_at,
        "created_at": t.created_at,
    }


# ---------------------------------------------------------------------------
# Auth dependency — validates an API token from the Bearer header
# ---------------------------------------------------------------------------

def require_api_token(request: Request, db: Session = Depends(get_db)) -> ApiToken:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing API token")
    raw = auth.split(" ", 1)[1]
    if not raw.startswith("rns_"):
        raise HTTPException(status_code=401, detail="Invalid API token format")
    h = _hash(raw)
    token = db.query(ApiToken).filter(ApiToken.token_hash == h).first()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid API token")
    if token.expires_at and token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="API token expired")
    return token


# ---------------------------------------------------------------------------
# CRUD endpoints (require JWT login)
# ---------------------------------------------------------------------------

@router.post("/", response_model=TokenCreated)
def create_token(
    body: TokenCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    raw = _make_token()
    t = ApiToken(
        name=body.name,
        token_hash=_hash(raw),
        user_id=current_user.id,
        expires_at=body.expires_at,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {**_to_out(t), "token": raw}


@router.get("/", response_model=List[TokenOut])
def list_tokens(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tokens = db.query(ApiToken).order_by(ApiToken.created_at.desc()).all()
    return [_to_out(t) for t in tokens]


@router.delete("/{token_id}")
def delete_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = db.query(ApiToken).filter(ApiToken.id == token_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
