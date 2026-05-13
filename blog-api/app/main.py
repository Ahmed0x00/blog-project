from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import engine, Base
from prometheus_fastapi_instrumentator import Instrumentator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: Clean up resources
    pass

app = FastAPI(
    title="Blog Management System API",
    description="API for the Blog Management System",
    version="1.0.0",
    lifespan=lifespan
)

# Instrument Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Blog Management System API"}
