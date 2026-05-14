from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from pydantic import BaseModel
from ..models.user import User, RoleEnum

class RoleUpdate(BaseModel):
    role: RoleEnum

def get_users(db: Session, offset: int = 0, limit: int = 10):
    total = db.query(User).count()
    users = db.query(User).offset(offset).limit(limit).all()
    return users, total

def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id {user_id} not found")
    return user

def delete_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    db.delete(user)
    db.commit()

def update_user_role(db: Session, user_id: int, role_update: RoleUpdate) -> User:
    user = get_user(db, user_id)
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user
