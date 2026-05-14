from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from .user import UserResponse
from .common import PaginatedResponse

class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    created_at: datetime
    updated_at: datetime
    
    author: UserResponse
    comment_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# We define a specific type for paginated posts
PostListResponse = PaginatedResponse[PostResponse]
