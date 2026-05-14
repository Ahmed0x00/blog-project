from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..schemas.post import PostCreate, PostUpdate, PostResponse, PostListResponse
from ..models.user import User
from ..services import post_service
from ..dependencies import get_current_user, allow_author, allow_admin
from ..utils.pagination import get_pagination_params, paginate
from ..cache.redis_client import cache_get, cache_set, cache_delete, cache_delete_pattern

router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("", response_model=PostListResponse)
def get_posts(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    cache_key = f"posts:page:{page}:size:{size}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    offset, limit, page = get_pagination_params(page, size)
    posts, total = post_service.get_posts(db, offset, limit)
    
    # We must convert SQLAlchemy models to dicts for caching
    result = paginate([PostResponse.model_validate(p).model_dump(mode='json') for p in posts], total, page, limit)
    cache_set(cache_key, result, ttl=300)
    return result

@router.get("/{id}", response_model=PostResponse)
def get_post(id: int, db: Session = Depends(get_db)):
    cache_key = f"post:{id}"
    cached = cache_get(cache_key)
    if cached:
        return cached
        
    post = post_service.get_post(db, id)
    result = PostResponse.model_validate(post).model_dump(mode='json')
    cache_set(cache_key, result, ttl=600)
    return result

@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(allow_author)
):
    post = post_service.create_post(db, post_in, current_user)
    cache_delete_pattern("posts:page:*")
    return post

@router.put("/{id}", response_model=PostResponse)
def update_post(
    id: int, 
    post_in: PostUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    post = post_service.update_post(db, id, post_in, current_user)
    cache_delete(f"post:{id}")
    cache_delete_pattern("posts:page:*")
    return post

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    post_service.delete_post(db, id, current_user)
    cache_delete(f"post:{id}")
    cache_delete_pattern("posts:page:*")
