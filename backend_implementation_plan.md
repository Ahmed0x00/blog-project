# Part 1: Backend Implementation Plan

> [!IMPORTANT]
> Every requirement from the assignment brief is mapped to a specific phase and step below. Phases are chronological — complete them in order.

---

## Phase 0: Version Control & Repository Setup
**Mapped Requirement:** `#6 — Version Control (Git/GitHub)`

### Steps
1. **Initialize the repository**
   ```bash
   git init
   git remote add origin <repo-url>
   ```
2. **Create the branching strategy**
   - `main` — production-ready, protected branch (merge via PR only).
   - `develop` — integration branch; all feature branches merge here first.
   - Feature branches: `feature/auth`, `feature/posts-crud`, `feature/comments`, `feature/caching`, `feature/logging`, `feature/testing`, etc.
3. **Add foundational files on `main`**
   - `.gitignore` (Python, venv, `.env`, `__pycache__`, `.pytest_cache`)
   - `README.md` (project title, description, tech stack, setup instructions, API docs link, team members, branching strategy). Continuously updated.
   - `LICENSE` (MIT or similar)
4. **Merge `main` → `develop`**, then all work begins from `develop`.
5. **Commit conventions:** Use prefixes (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) so individual contributions are trackable.

---

## Phase 1: Project Structure & Core Setup
**Mapped Requirement:** `#1 — Project Structure`

### Target Directory Layout
```
blog-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory, lifespan events
│   ├── config.py             # Settings via pydantic-settings (env vars)
│   ├── database.py           # SQLAlchemy engine, SessionLocal, Base
│   ├── dependencies.py       # Shared deps (get_db, get_current_user)
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── post.py
│   │   └── comment.py
│   ├── schemas/              # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── post.py
│   │   ├── comment.py
│   │   └── common.py         # Paginated response wrapper, error schema
│   ├── routers/              # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── posts.py
│   │   └── comments.py
│   ├── services/             # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── post_service.py
│   │   └── comment_service.py
│   ├── cache/                # Redis caching utilities
│   │   ├── __init__.py
│   │   └── redis_client.py
│   ├── middleware/           # Custom middleware
│   │   ├── __init__.py
│   │   └── logging_middleware.py
│   ├── monitoring/           # Prometheus metrics
│   │   ├── __init__.py
│   │   └── metrics.py
│   └── utils/                # Helpers (hashing, token utils, pagination)
│       ├── __init__.py
│       ├── security.py
│       └── pagination.py
├── tests/                    # Pytest test suite
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_posts.py
│   ├── test_comments.py
│   └── test_edge_cases.py
├── docker-compose.yml        # App + PostgreSQL + Redis + Prometheus + Grafana
├── prometheus.yml            # Prometheus scrape config
├── requirements.txt
├── .env.example
└── README.md
```

### Steps
1. Create the directory tree above.
2. **`requirements.txt`**: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `psycopg2-binary` (or `aiosqlite` for dev), `pydantic[email]`, `pydantic-settings`, `python-jose[cryptography]`, `passlib[bcrypt]`, `redis`, `pytest`, `httpx`, `loguru`, `prometheus-fastapi-instrumentator`.
3. **`app/config.py`**: Use `pydantic-settings.BaseSettings` to load `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` from `.env`.
4. **`app/database.py`**: Configure SQLAlchemy `create_engine`, `SessionLocal` factory, and declarative `Base`. Provide a `get_db` dependency generator.
5. **`app/main.py`**: Instantiate `FastAPI(lifespan=...)`. Register routers, middleware, and Prometheus instrumentation here. Use the `lifespan` context manager to handle DB table creation and Redis connection on startup/shutdown.
6. **`docker-compose.yml`**: Define services for `app`, `postgres`, `redis`, `prometheus`, `grafana`. Map ports and volumes.

> [!TIP]
> Use SQLite during early development for speed; swap to PostgreSQL in docker-compose for final submission.

**Branch:** `feature/project-setup` → merge to `develop`.

---

## Phase 2: Database Models (SQLAlchemy ORM)
**Mapped Requirement:** `#1 — Models`

### Models to Define

| Model | Key Columns | Notes |
|-------|-------------|-------|
| **User** | `id` (PK), `username` (unique), `email` (unique), `hashed_password`, `role` (Enum: admin/author/reader), `created_at` | Role defaults to `reader` |
| **Post** | `id` (PK), `title`, `content`, `author_id` (FK → User), `created_at`, `updated_at` | Cascade delete on author removal |
| **Comment** | `id` (PK), `content`, `post_id` (FK → Post), `author_id` (FK → User), `parent_id` (FK → Comment, nullable), `created_at` | `parent_id = NULL` means top-level comment; self-referential FK enables nesting |

### Steps
1. Define each model in `app/models/` with proper relationships (`relationship()`, `back_populates`).
2. For **nested comments**, use a self-referential relationship:
   ```python
   parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
   children = relationship("Comment", back_populates="parent", lazy="selectin")
   parent = relationship("Comment", back_populates="children", remote_side=[id])
   ```
3. Add `__repr__` methods for debugging.
4. Ensure `Base.metadata.create_all(bind=engine)` runs on startup.

**Branch:** `feature/models` → merge to `develop`.

---

## Phase 3: Pydantic Schemas
**Mapped Requirement:** `#2 — Pydantic models for request validation & response models`

### Schemas per Entity

**User Schemas (`app/schemas/user.py`):**
- `UserCreate` — `username`, `email`, `password` (with `@field_validator` for strength).
- `UserResponse` — `id`, `username`, `email`, `role`, `created_at`. **Never expose password.**
- `UserLogin` — `email`, `password`.
- `Token` — `access_token`, `token_type`.
- `TokenData` — `user_id`, `role`.

**Post Schemas (`app/schemas/post.py`):**
- `PostCreate` — `title`, `content`.
- `PostUpdate` — `title` (optional), `content` (optional).
- `PostResponse` — all fields + `author: UserResponse` + `comment_count`.
- `PostListResponse` — wraps paginated list.

**Comment Schemas (`app/schemas/comment.py`):**
- `CommentCreate` — `content`, `parent_id` (optional, for nesting).
- `CommentUpdate` — `content`.
- `CommentResponse` — all fields + `author: UserResponse` + `children: List[CommentResponse]` (recursive).

**Common (`app/schemas/common.py`):**
- `PaginatedResponse[T]` — `items: List[T]`, `total`, `page`, `size`, `pages`.
- `ErrorResponse` — `detail: str`.

### Steps
1. Define all schemas using `pydantic.BaseModel` with `model_config = ConfigDict(from_attributes=True)`.
2. Add field validators where appropriate (e.g., title length, content not empty).
3. Use `response_model` on every endpoint for consistent output.

**Branch:** `feature/schemas` → merge to `develop`.

---

## Phase 4: JWT Authentication
**Mapped Requirement:** `#3 — JWT Authentication`

### Steps
1. **`app/utils/security.py`:**
   - `hash_password(password) → str` using `passlib.context.CryptContext(schemes=["bcrypt"])`.
   - `verify_password(plain, hashed) → bool`.
   - `create_access_token(data: dict, expires_delta) → str` using `python-jose.jwt.encode()`.
   - `decode_access_token(token) → TokenData` — decode and validate; raise on expiry/invalid.

2. **`app/dependencies.py`:**
   - `get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) → User`: Extract user from token, query DB, return user object. Raise `401` if invalid.
   - `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")`.

3. **`app/routers/auth.py`:**

   | Endpoint | Method | Description | Status Codes |
   |----------|--------|-------------|--------------|
   | `/api/auth/register` | POST | Create user (defaults to `reader` role) | `201`, `400`, `409` |
   | `/api/auth/login` | POST | Validate credentials, return JWT | `200`, `401` |
   | `/api/auth/me` | GET | Return current user profile (protected) | `200`, `401` |

4. **`app/services/auth_service.py`:** Business logic for registration (check duplicates, hash password, save) and login (verify, generate token).

**Branch:** `feature/auth` → merge to `develop`.

---

## Phase 5: Role-Based Authorization
**Mapped Requirement:** `#4 — Role-Based Authorization`

### Steps
1. **Create role-checker dependencies in `app/dependencies.py`:**
   ```python
   class RoleChecker:
       def __init__(self, allowed_roles: List[str]):
           self.allowed_roles = allowed_roles

       def __call__(self, user: User = Depends(get_current_user)):
           if user.role not in self.allowed_roles:
               raise HTTPException(status_code=403, detail="Insufficient permissions")
           return user

   allow_admin = RoleChecker(["admin"])
   allow_author = RoleChecker(["admin", "author"])
   allow_reader = RoleChecker(["admin", "author", "reader"])
   ```

2. **Ownership checks** (in services): For update/delete on posts and comments, verify `resource.author_id == current_user.id` OR `current_user.role == "admin"`. Raise `403` otherwise.

3. **Permission matrix:**

   | Action | Admin | Author | Reader |
   |--------|-------|--------|--------|
   | View posts/comments | ✅ | ✅ | ✅ |
   | Create post | ✅ | ✅ | ❌ |
   | Edit/Delete own post | ✅ | ✅ (own) | ❌ |
   | Delete any post | ✅ | ❌ | ❌ |
   | Create comment | ✅ | ✅ | ✅ |
   | Edit/Delete own comment | ✅ | ✅ (own) | ✅ (own) |
   | Delete any comment | ✅ | ❌ | ❌ |
   | Manage users | ✅ | ❌ | ❌ |

**Branch:** `feature/authorization` → merge to `develop`.

---

## Phase 6: RESTful CRUD Endpoints
**Mapped Requirement:** `#2 — RESTful API (GET, POST, PUT, DELETE)`

### 6A — Posts Router (`app/routers/posts.py`)

| Endpoint | Method | Auth | Role | Description | Status Codes |
|----------|--------|------|------|-------------|--------------|
| `/api/posts` | GET | ❌ | Any | List all posts (paginated) | `200` |
| `/api/posts/{id}` | GET | ❌ | Any | Get post by ID | `200`, `404` |
| `/api/posts` | POST | ✅ | Author+ | Create post | `201`, `401`, `403`, `422` |
| `/api/posts/{id}` | PUT | ✅ | Owner/Admin | Update post | `200`, `401`, `403`, `404`, `422` |
| `/api/posts/{id}` | DELETE | ✅ | Owner/Admin | Delete post | `204`, `401`, `403`, `404` |

### 6B — Comments Router (`app/routers/comments.py`)

| Endpoint | Method | Auth | Role | Description | Status Codes |
|----------|--------|------|------|-------------|--------------|
| `/api/posts/{post_id}/comments` | GET | ❌ | Any | List comments for post (paginated, threaded) | `200`, `404` |
| `/api/posts/{post_id}/comments` | POST | ✅ | Any logged-in | Create comment (optionally nested via `parent_id`) | `201`, `401`, `404`, `422` |
| `/api/comments/{id}` | PUT | ✅ | Owner/Admin | Update comment | `200`, `401`, `403`, `404` |
| `/api/comments/{id}` | DELETE | ✅ | Owner/Admin | Delete comment | `204`, `401`, `403`, `404` |

### 6C — Users Router (`app/routers/users.py`) — Admin Only

| Endpoint | Method | Auth | Role | Description | Status Codes |
|----------|--------|------|------|-------------|--------------|
| `/api/users` | GET | ✅ | Admin | List all users | `200`, `401`, `403` |
| `/api/users/{id}` | GET | ✅ | Admin | Get user by ID | `200`, `404` |
| `/api/users/{id}` | DELETE | ✅ | Admin | Delete user | `204`, `401`, `403`, `404` |
| `/api/users/{id}/role` | PUT | ✅ | Admin | Update user role | `200`, `401`, `403` |

### Steps
1. Implement service functions in `app/services/` — each handles DB queries, ownership validation, and returns data or raises exceptions.
2. Implement routers in `app/routers/` — thin controllers that call services and apply `Depends()` for auth/role.
3. Use `response_model` on every endpoint. Use `status_code` parameter on route decorators.
4. **Pagination utility** (`app/utils/pagination.py`): Accept `page` (default 1) and `size` (default 10) as query params. Compute `offset`, `limit`, `total_pages`. Return `PaginatedResponse`.
5. **Nested comments:** When fetching comments, query top-level (`parent_id IS NULL`) and eagerly load `children` recursively. Limit nesting depth to 3-5 levels if needed.

**Branch:** `feature/posts-crud`, `feature/comments-crud` → merge to `develop`.

---

## Phase 7: Error Handling
**Mapped Requirement:** `#5 — Error Handling`

### Steps
1. **Custom exception handlers in `app/main.py`:**
   - `RequestValidationError` handler → return `422` with readable field-level errors.
   - `HTTPException` handler → standardize format: `{"detail": "...", "status_code": 4xx}`.
   - Generic `Exception` handler → return `500` with `"Internal Server Error"`, log full traceback.
2. **Consistent error response schema** (`ErrorResponse`) used across all error responses.
3. **Service-layer exceptions:** Raise `HTTPException` with descriptive messages:
   - `404`: "Post with id {id} not found"
   - `403`: "You do not have permission to edit this post"
   - `409`: "A user with this email already exists"
   - `401`: "Invalid or expired token"
4. **Validation:** Pydantic handles field validation; add custom validators for business rules (e.g., post title max 200 chars, comment content min 1 char).

**Branch:** `feature/error-handling` → merge to `develop`.

---

## Phase 8: Redis Caching (Cache-Aside Pattern)
**Mapped Requirement:** `#7 — Caching (Redis)`

### Steps
1. **`app/cache/redis_client.py`:**
   - Initialize `redis.Redis` connection (from `REDIS_URL` in config).
   - Helper functions: `cache_get(key) → dict | None`, `cache_set(key, value, ttl)`, `cache_delete(key)`, `cache_delete_pattern(pattern)`.
   - Serialize/deserialize with `json.dumps`/`json.loads`.

2. **Cache-Aside Pattern implementation in services:**

   | Operation | Cache Behavior |
   |-----------|---------------|
   | `GET /posts` | Check cache key `posts:page:{p}:size:{s}`. If hit → return. If miss → query DB, store in cache (TTL 300s), return. |
   | `GET /posts/{id}` | Check key `post:{id}`. If hit → return. If miss → query DB, cache, return. |
   | `POST /posts` | After DB insert → invalidate `posts:page:*` (all list caches). |
   | `PUT /posts/{id}` | After DB update → delete `post:{id}` and invalidate `posts:page:*`. |
   | `DELETE /posts/{id}` | After DB delete → delete `post:{id}` and invalidate `posts:page:*`. |
   | `GET /posts/{id}/comments` | Check key `comments:post:{id}:page:{p}`. Cache miss → DB query, cache. |
   | Comment CUD | Invalidate `comments:post:{post_id}:*`. |

3. **TTL strategy:** 5 minutes for list endpoints, 10 minutes for single-resource endpoints.
4. **Graceful degradation:** If Redis is unavailable, catch `ConnectionError` and fall through to DB (log a warning).

**Branch:** `feature/caching` → merge to `develop`.

---

## Phase 9: Logging & Monitoring
**Mapped Requirement:** `#8 — Logging & Monitoring`

### 9A — Structured Logging

1. **Use `loguru`** for structured logging. Configure in `app/main.py`:
   - Output format: `{time} | {level} | {module}:{function}:{line} | {message}`
   - Log to console + file (`logs/app.log`) with rotation (10 MB) and retention (7 days).
   - Log levels: `DEBUG` for dev, `INFO` for production.

2. **`app/middleware/logging_middleware.py`:**
   - Custom `BaseHTTPMiddleware` that logs every request/response:
     ```
     INFO | REQUEST  | POST /api/posts | client=192.168.1.1
     INFO | RESPONSE | POST /api/posts | status=201 | duration=45ms
     ```
   - Log `WARNING` for 4xx responses, `ERROR` for 5xx responses.

3. **Log categories captured:**
   - **API requests/responses:** method, endpoint, status code, response time.
   - **Auth events:** login success/failure, registration, token validation failures.
   - **CRUD operations:** "Post created (id=5, author=john)", "Comment deleted (id=12, by=admin)".
   - **DB interactions:** query execution warnings, connection errors.
   - **Cache events:** hits, misses, invalidations.

### 9B — Monitoring Dashboard (Prometheus + Grafana)

1. **Integrate `prometheus-fastapi-instrumentator`** in `app/main.py`:
   ```python
   from prometheus_fastapi_instrumentator import Instrumentator
   Instrumentator().instrument(app).expose(app, endpoint="/metrics")
   ```
   This auto-exposes: request counts, response times (histograms), in-progress requests, response sizes.

2. **Custom metrics in `app/monitoring/metrics.py`:**
   - `blog_posts_total` (Counter) — total posts created.
   - `blog_comments_total` (Counter) — total comments created.
   - `cache_hits_total` / `cache_misses_total` (Counters).
   - `auth_login_success_total` / `auth_login_failure_total` (Counters).
   - `db_query_duration_seconds` (Histogram).

3. **`prometheus.yml`:**
   ```yaml
   scrape_configs:
     - job_name: 'blog-api'
       scrape_interval: 15s
       static_configs:
         - targets: ['app:8000']
   ```

4. **Grafana dashboard:**
   - Pre-configured via provisioned JSON dashboard file in `docker-compose`.
   - Panels: Request Rate, Error Rate (4xx/5xx), P95 Response Time, Cache Hit Ratio, Active Users, System Health (up/down).

5. **Custom health endpoint:**
   - `GET /api/health` → returns `{"status": "healthy", "database": "connected", "redis": "connected", "uptime": "..."}`.

**Branch:** `feature/logging`, `feature/monitoring` → merge to `develop`.

---

## Phase 10: API Testing (Pytest)
**Mapped Requirement:** `#9 — API Testing`

### Steps
1. **`tests/conftest.py`:**
   - Create a test database (SQLite in-memory).
   - Override `get_db` dependency.
   - Create `TestClient` from `app.main.app`.
   - Fixtures: `client`, `db_session`, `test_user` (reader), `test_author`, `test_admin`, `auth_headers_reader`, `auth_headers_author`, `auth_headers_admin`.

2. **`tests/test_auth.py`:**
   - ✅ Register a new user → `201`.
   - ✅ Register with duplicate email → `409`.
   - ✅ Register with invalid data → `422`.
   - ✅ Login with valid credentials → `200`, returns token.
   - ✅ Login with wrong password → `401`.
   - ✅ Access protected route without token → `401`.
   - ✅ Access protected route with expired/invalid token → `401`.

3. **`tests/test_posts.py`:**
   - ✅ List posts (empty) → `200`, `items: []`.
   - ✅ Create post as author → `201`.
   - ✅ Create post as reader → `403`.
   - ✅ Get post by ID → `200`.
   - ✅ Get non-existent post → `404`.
   - ✅ Update own post → `200`.
   - ✅ Update another author's post → `403`.
   - ✅ Admin deletes any post → `204`.
   - ✅ Pagination: create 15 posts, request page 1 size 10 → 10 items, total 15.

4. **`tests/test_comments.py`:**
   - ✅ Create comment on post → `201`.
   - ✅ Create nested comment (with `parent_id`) → `201`.
   - ✅ Nested comment response includes `children` array.
   - ✅ Comment on non-existent post → `404`.
   - ✅ Delete own comment → `204`.
   - ✅ Delete another's comment as reader → `403`.
   - ✅ Admin deletes any comment → `204`.
   - ✅ Pagination for comments.

5. **`tests/test_edge_cases.py`:**
   - ✅ Empty body on POST → `422`.
   - ✅ Very long title/content → validation error or accept (define boundary).
   - ✅ Nested comment with invalid `parent_id` → `404`.
   - ✅ Delete post cascades comments.
   - ✅ Concurrent operations don't break (optional).

6. **Run tests:**
   ```bash
   pytest tests/ -v --tb=short
   ```

**Branch:** `feature/testing` → merge to `develop`.

---

## Phase 11: Final Integration & Merge
### Steps
1. Merge `develop` → `main` via Pull Request.
2. Tag the release: `git tag v1.0.0`.
3. Final `README.md` update with:
   - Project overview & architecture diagram.
   - Setup instructions (Docker & local).
   - API endpoint documentation table.
   - Testing instructions.
   - Caching strategy explanation.
   - Monitoring dashboard screenshots.
   - Team member contributions.
4. Verify `docker-compose up` boots all services cleanly.
5. Run full test suite one final time.
