from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from ..models.post import Post
from ..models.comment import Comment
from ..models.user import User
from ..schemas.post import PostCreate, PostUpdate

def get_posts(db: Session, offset: int = 0, limit: int = 10):
    total = db.query(Post).count()
    
    # We need to return Posts but annotated with comment_count.
    # To keep it simple, we can fetch posts, then for each attach comment_count.
    posts = db.query(Post).order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    
    for post in posts:
        post.comment_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        
    return posts, total

def get_post(db: Session, post_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id {post_id} not found")
    
    post.comment_count = db.query(Comment).filter(Comment.post_id == post.id).count()
    return post

def create_post(db: Session, post_in: PostCreate, current_user: User) -> Post:
    db_post = Post(
        title=post_in.title,
        content=post_in.content,
        author_id=current_user.id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    db_post.comment_count = 0
    return db_post

def update_post(db: Session, post_id: int, post_in: PostUpdate, current_user: User) -> Post:
    post = get_post(db, post_id)
    
    if post.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this post")
        
    if post_in.title is not None:
        post.title = post_in.title
    if post_in.content is not None:
        post.content = post_in.content
        
    db.commit()
    db.refresh(post)
    return post

def delete_post(db: Session, post_id: int, current_user: User):
    post = get_post(db, post_id)
    
    if post.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this post")
        
    db.delete(post)
    db.commit()
