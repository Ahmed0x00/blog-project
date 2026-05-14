import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User, RoleEnum
from app.utils.security import hash_password, create_access_token

# ─────────────────────────────────────────────────────────────────────────────
# Use a pure in-memory SQLite DB per test session.
# StaticPool ensures all connections share the same in-memory database instance.
# This means no leftover files (test_db.db), no cross-run contamination.
# ─────────────────────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once for the entire test session, drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(setup_database):
    """
    Provides a DB session wrapped in a transaction that is rolled back
    after each test — this keeps tests fully isolated from each other
    without recreating tables every time.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with the DB dependency overridden to use the test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    del app.dependency_overrides[get_db]


# ─────────────────────────────────────────────────────────────────────────────
# User fixtures — each creates a user in the rolled-back transaction
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def test_reader(db_session):
    user = User(
        username="reader_user",
        email="reader@test.com",
        hashed_password=hash_password("password123"),
        role=RoleEnum.reader,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_author(db_session):
    user = User(
        username="author_user",
        email="author@test.com",
        hashed_password=hash_password("password123"),
        role=RoleEnum.author,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_admin(db_session):
    user = User(
        username="admin_user",
        email="admin@test.com",
        hashed_password=hash_password("password123"),
        role=RoleEnum.admin,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ─────────────────────────────────────────────────────────────────────────────
# Auth header helpers — generate Bearer tokens directly (no HTTP round-trip)
# ─────────────────────────────────────────────────────────────────────────────

def make_auth_headers(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def reader_headers(test_reader):
    return make_auth_headers(test_reader)


@pytest.fixture
def author_headers(test_author):
    return make_auth_headers(test_author)


@pytest.fixture
def admin_headers(test_admin):
    return make_auth_headers(test_admin)
