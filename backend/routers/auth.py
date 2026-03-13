from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
import os

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "secret")
JWT_ALGORITHM = "HS256"

class LoginRequest(BaseModel):
	username: str
	password: str

class LoginResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
	user = db.query(User).filter(User.username == data.username, User.is_active == True).first()
	if not user or not pwd_context.verify(data.password, user.password_hash):
		raise HTTPException(status_code=401, detail="Invalid credentials")
	token = jwt.encode({"sub": user.username, "is_admin": user.is_admin}, JWT_SECRET, algorithm=JWT_ALGORITHM)
	return {"access_token": token, "token_type": "bearer"}

# Permisos admin
from fastapi import Request
from jose import JWTError

def get_current_user(request: Request, db: Session = Depends(get_db)):
	auth_header = request.headers.get("Authorization")
	if not auth_header or not auth_header.startswith("Bearer "):
		raise HTTPException(status_code=401, detail="Missing token")
	token = auth_header.split(" ")[1]
	try:
		payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
		username = payload.get("sub")
		user = db.query(User).filter(User.username == username).first()
		if not user:
			raise HTTPException(status_code=401, detail="User not found")
		return user
	except JWTError:
		raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user=Depends(get_current_user)):
	if not user.is_admin:
		raise HTTPException(status_code=403, detail="Admin required")
	return user
