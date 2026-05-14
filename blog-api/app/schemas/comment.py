from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from .user import UserResponse

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[int] = None

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class CommentResponse(BaseModel):
    id: int
    content: str
    post_id: int
    author_id: int
    parent_id: Optional[int] = None
    created_at: datetime
    
    author: UserResponse
    children: List['CommentResponse'] = []

    model_config = ConfigDict(from_attributes=True)

# Important for resolving the self-referencing forward reference in CommentResponse
CommentResponse.model_rebuild()
