from typing import TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")

def paginate(items: List[T], total: int, page: int, size: int) -> dict:
    pages = (total + size - 1) // size if size > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def get_pagination_params(page: int = 1, size: int = 10):
    if page < 1:
        page = 1
    if size < 1:
        size = 10
    elif size > 100:
        size = 100
    offset = (page - 1) * size
    return offset, size, page
