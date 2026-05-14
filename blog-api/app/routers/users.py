from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.user import UserResponse
from ..schemas.common import PaginatedResponse
from ..models.user import User
from ..services import user_service
from ..services.user_service import RoleUpdate
from ..dependencies import allow_admin
from ..utils.pagination import get_pagination_params, paginate

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=PaginatedResponse[UserResponse])
def get_users(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db), current_admin: User = Depends(allow_admin)):
    offset, limit, page = get_pagination_params(page, size)
    users, total = user_service.get_users(db, offset, limit)
    return paginate(users, total, page, limit)

@router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db: Session = Depends(get_db), current_admin: User = Depends(allow_admin)):
    return user_service.get_user(db, id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int, db: Session = Depends(get_db), current_admin: User = Depends(allow_admin)):
    user_service.delete_user(db, id)

@router.put("/{id}/role", response_model=UserResponse)
def update_role(id: int, role_update: RoleUpdate, db: Session = Depends(get_db), current_admin: User = Depends(allow_admin)):
    return user_service.update_user_role(db, id, role_update)
