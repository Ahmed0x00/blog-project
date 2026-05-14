from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.comment import Comment
from ..models.post import Post
from ..models.user import User
from ..schemas.comment import CommentCreate, CommentUpdate

def get_comments_for_post(db: Session, post_id: int, offset: int = 0, limit: int = 10):
    # Verify post exists
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
    query = db.query(Comment).filter(Comment.post_id == post_id, Comment.parent_id == None)
    total = query.count()
    comments = query.order_by(Comment.created_at.asc()).offset(offset).limit(limit).all()
    
    return comments, total

def get_comment(db: Session, comment_id: int) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Comment with id {comment_id} not found")
    return comment

def create_comment(db: Session, post_id: int, comment_in: CommentCreate, current_user: User) -> Comment:
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
    if comment_in.parent_id:
        parent = get_comment(db, comment_in.parent_id)
        if parent.post_id != post_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment does not belong to this post")
            
    db_comment = Comment(
        content=comment_in.content,
        post_id=post_id,
        author_id=current_user.id,
        parent_id=comment_in.parent_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def update_comment(db: Session, comment_id: int, comment_in: CommentUpdate, current_user: User) -> Comment:
    comment = get_comment(db, comment_id)
    
    if comment.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this comment")
        
    comment.content = comment_in.content
    db.commit()
    db.refresh(comment)
    return comment

def delete_comment(db: Session, comment_id: int, current_user: User):
    comment = get_comment(db, comment_id)
    
    if comment.author_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this comment")
        
    db.delete(comment)
    db.commit()
