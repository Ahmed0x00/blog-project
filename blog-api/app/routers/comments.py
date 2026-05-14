from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from ..schemas.common import PaginatedResponse
from ..models.user import User
from ..services import comment_service
from ..dependencies import get_current_user
from ..utils.pagination import get_pagination_params, paginate
from ..cache.redis_client import cache_get, cache_set, cache_delete_pattern

router = APIRouter(tags=["comments"])

@router.get("/api/posts/{post_id}/comments", response_model=PaginatedResponse[CommentResponse])
def get_comments(post_id: int, page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    cache_key = f"comments:post:{post_id}:page:{page}:size:{size}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    offset, limit, page = get_pagination_params(page, size)
    comments, total = comment_service.get_comments_for_post(db, post_id, offset, limit)
    
    result = paginate([CommentResponse.model_validate(c).model_dump(mode='json') for c in comments], total, page, limit)
    cache_set(cache_key, result, ttl=300)
    return result

@router.post("/api/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    comment_in: CommentCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    comment = comment_service.create_comment(db, post_id, comment_in, current_user)
    cache_delete_pattern(f"comments:post:{post_id}:*")
    return comment

@router.put("/api/comments/{id}", response_model=CommentResponse)
def update_comment(
    id: int, 
    comment_in: CommentUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    comment = comment_service.update_comment(db, id, comment_in, current_user)
    cache_delete_pattern(f"comments:post:{comment.post_id}:*")
    return comment

@router.delete("/api/comments/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    comment = comment_service.get_comment(db, id) # We need to get post_id before deleting to invalidate cache properly
    post_id = comment.post_id
    comment_service.delete_comment(db, id, current_user)
    cache_delete_pattern(f"comments:post:{post_id}:*")
