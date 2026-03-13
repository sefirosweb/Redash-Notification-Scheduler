from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.job import Group
from pydantic import BaseModel

router = APIRouter()

class GroupCreate(BaseModel):
	name: str
	emails: str

class GroupOut(GroupCreate):
	id: int
	class Config:
		from_attributes = True

class GroupUpdate(BaseModel):
	name: str = None
	emails: str = None

@router.get("/", response_model=List[GroupOut])
def list_groups(db: Session = Depends(get_db)):
	return db.query(Group).all()

@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db)):
	group = db.query(Group).filter(Group.id == group_id).first()
	if not group:
		raise HTTPException(status_code=404, detail="Group not found")
	return group

@router.post("/", response_model=GroupOut)
def create_group(group: GroupCreate, db: Session = Depends(get_db)):
	db_group = Group(**group.dict())
	db.add(db_group)
	db.commit()
	db.refresh(db_group)
	return db_group

@router.put("/{group_id}", response_model=GroupOut)
def update_group(group_id: int, group: GroupUpdate, db: Session = Depends(get_db)):
	db_group = db.query(Group).filter(Group.id == group_id).first()
	if not db_group:
		raise HTTPException(status_code=404, detail="Group not found")
	for key, value in group.dict(exclude_unset=True).items():
		setattr(db_group, key, value)
	db.commit()
	db.refresh(db_group)
	return db_group

@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
	db_group = db.query(Group).filter(Group.id == group_id).first()
	if not db_group:
		raise HTTPException(status_code=404, detail="Group not found")
	db.delete(db_group)
	db.commit()
	return {"ok": True}
