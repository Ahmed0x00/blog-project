from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
from loguru import logger
from .database import engine, Base
from prometheus_fastapi_instrumentator import Instrumentator

from .routers import auth_router, posts_router, comments_router, users_router
from .schemas.common import ErrorResponse
from .middleware.logging_middleware import LoggingMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure logging
    logger.add("logs/app.log", rotation="10 MB", retention="7 days", level="INFO")
    logger.info("Application starting up...")
    # Startup: Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: Clean up resources
    logger.info("Application shutting down...")

app = FastAPI(
    title="Blog Management System API",
    description="API for the Blog Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow browser frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev; restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Middleware
app.add_middleware(LoggingMiddleware)

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"loc": err["loc"], "msg": err["msg"], "type": err["type"]} for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(detail=str(exc.detail)).model_dump()
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the exception here
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(detail="Internal Server Error").model_dump()
    )

# Instrument Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Include Routers
app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(comments_router)
app.include_router(users_router)

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Blog Management System API"}
