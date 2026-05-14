"""
Comprehensive API test suite for the Blog Management System.
Covers: Auth, Posts, Comments, Users — happy paths + all edge/error cases.
"""
import pytest
from fastapi.testclient import TestClient


# =============================================================================
# SECTION 1 — AUTH
# =============================================================================

class TestAuth:

    def test_register_success(self, client: TestClient):
        resp = client.post("/api/auth/register", json={
            "username": "alice",
            "email": "alice@test.com",
            "password": "securepass1"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "alice"
        assert data["email"] == "alice@test.com"
        assert data["role"] == "reader"           # default role
        assert "id" in data
        assert "hashed_password" not in data      # must NOT expose password

    def test_register_duplicate_email(self, client: TestClient):
        payload = {"username": "user1", "email": "dup@test.com", "password": "password123"}
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json={
            "username": "user2", "email": "dup@test.com", "password": "password123"
        })
        assert resp.status_code == 409

    def test_register_duplicate_username(self, client: TestClient):
        payload = {"username": "dupname", "email": "a@test.com", "password": "password123"}
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json={
            "username": "dupname", "email": "b@test.com", "password": "password123"
        })
        assert resp.status_code == 409

    def test_register_short_password(self, client: TestClient):
        resp = client.post("/api/auth/register", json={
            "username": "bob", "email": "bob@test.com", "password": "short"
        })
        assert resp.status_code == 422

    def test_register_short_username(self, client: TestClient):
        resp = client.post("/api/auth/register", json={
            "username": "ab", "email": "ab@test.com", "password": "validpassword"
        })
        assert resp.status_code == 422

    def test_register_invalid_email(self, client: TestClient):
        resp = client.post("/api/auth/register", json={
            "username": "charlie", "email": "not-an-email", "password": "validpassword"
        })
        assert resp.status_code == 422

    def test_login_success(self, client: TestClient, test_reader):
        resp = client.post("/api/auth/login", data={
            "username": test_reader.email, "password": "password123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_reader):
        resp = client.post("/api/auth/login", data={
            "username": test_reader.email, "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        resp = client.post("/api/auth/login", data={
            "username": "ghost@nowhere.com", "password": "password123"
        })
        assert resp.status_code == 401

    def test_get_me_authenticated(self, client: TestClient, test_author, author_headers):
        resp = client.get("/api/auth/me", headers=author_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_author.email
        assert data["role"] == "author"

    def test_get_me_unauthenticated(self, client: TestClient):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer this.is.invalid"})
        assert resp.status_code == 401


# =============================================================================
# SECTION 2 — POSTS
# =============================================================================

class TestPosts:

    def _create_post(self, client, headers, title="Test Post", content="Test content"):
        resp = client.post("/api/posts", json={"title": title, "content": content}, headers=headers)
        assert resp.status_code == 201
        return resp.json()

    # ── Happy paths ──────────────────────────────────────────────────────────

    def test_create_post_as_author(self, client: TestClient, author_headers):
        resp = client.post("/api/posts", json={
            "title": "Author's Post", "content": "Some content here"
        }, headers=author_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Author's Post"
        assert data["comment_count"] == 0
        assert "author" in data

    def test_create_post_as_admin(self, client: TestClient, admin_headers):
        resp = client.post("/api/posts", json={
            "title": "Admin Post", "content": "Admin wrote this"
        }, headers=admin_headers)
        assert resp.status_code == 201

    def test_get_all_posts_public(self, client: TestClient, author_headers):
        self._create_post(client, author_headers, title="Post A")
        self._create_post(client, author_headers, title="Post B")
        resp = client.get("/api/posts")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "pages" in data
        assert data["total"] >= 2

    def test_get_post_by_id(self, client: TestClient, author_headers):
        post = self._create_post(client, author_headers)
        resp = client.get(f"/api/posts/{post['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == post["id"]

    def test_get_post_not_found(self, client: TestClient):
        resp = client.get("/api/posts/999999")
        assert resp.status_code == 404

    def test_update_post_by_owner(self, client: TestClient, author_headers):
        post = self._create_post(client, author_headers)
        resp = client.put(f"/api/posts/{post['id']}",
                          json={"title": "Updated Title"},
                          headers=author_headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"
        assert resp.json()["content"] == post["content"]  # unchanged

    def test_update_post_by_admin(self, client: TestClient, author_headers, admin_headers):
        post = self._create_post(client, author_headers)
        resp = client.put(f"/api/posts/{post['id']}",
                          json={"content": "Admin-edited content"},
                          headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["content"] == "Admin-edited content"

    def test_delete_post_by_owner(self, client: TestClient, author_headers):
        post = self._create_post(client, author_headers)
        resp = client.delete(f"/api/posts/{post['id']}", headers=author_headers)
        assert resp.status_code == 204
        assert client.get(f"/api/posts/{post['id']}").status_code == 404

    def test_delete_post_by_admin(self, client: TestClient, author_headers, admin_headers):
        post = self._create_post(client, author_headers)
        resp = client.delete(f"/api/posts/{post['id']}", headers=admin_headers)
        assert resp.status_code == 204

    def test_pagination_params(self, client: TestClient, author_headers):
        for i in range(5):
            self._create_post(client, author_headers, title=f"Paginated Post {i}")
        resp = client.get("/api/posts?page=1&size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) <= 2
        assert data["size"] == 2

    # ── Access control ────────────────────────────────────────────────────────

    def test_create_post_as_reader_forbidden(self, client: TestClient, reader_headers):
        resp = client.post("/api/posts", json={
            "title": "Reader's attempt", "content": "content"
        }, headers=reader_headers)
        assert resp.status_code == 403

    def test_create_post_unauthenticated(self, client: TestClient):
        resp = client.post("/api/posts", json={"title": "No auth", "content": "content"})
        assert resp.status_code == 401

    def test_update_post_by_other_author_forbidden(
        self, client: TestClient, author_headers, db_session
    ):
        """A second author must not edit another author's post."""
        from app.models.user import User, RoleEnum
        from app.utils.security import hash_password, create_access_token

        other = User(
            username="other_author",
            email="other@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.author,
        )
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        other_token = create_access_token({"sub": str(other.id), "role": other.role.value})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        post = self._create_post(client, author_headers)
        resp = client.put(f"/api/posts/{post['id']}",
                          json={"title": "Hijacked"},
                          headers=other_headers)
        assert resp.status_code == 403

    def test_delete_post_by_other_author_forbidden(
        self, client: TestClient, author_headers, db_session
    ):
        from app.models.user import User, RoleEnum
        from app.utils.security import hash_password, create_access_token

        other = User(
            username="other_author2",
            email="other2@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.author,
        )
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        other_token = create_access_token({"sub": str(other.id), "role": other.role.value})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        post = self._create_post(client, author_headers)
        resp = client.delete(f"/api/posts/{post['id']}", headers=other_headers)
        assert resp.status_code == 403

    # ── Validation ────────────────────────────────────────────────────────────

    def test_create_post_empty_title(self, client: TestClient, author_headers):
        resp = client.post("/api/posts", json={"title": "", "content": "content"}, headers=author_headers)
        assert resp.status_code == 422

    def test_create_post_missing_fields(self, client: TestClient, author_headers):
        resp = client.post("/api/posts", json={"title": "Only title"}, headers=author_headers)
        assert resp.status_code == 422


# =============================================================================
# SECTION 3 — COMMENTS
# =============================================================================

class TestComments:

    def _create_post(self, client, headers):
        resp = client.post("/api/posts", json={"title": "Post for comments", "content": "body"}, headers=headers)
        return resp.json()

    def _create_comment(self, client, post_id, headers, content="Nice post!", parent_id=None):
        payload = {"content": content}
        if parent_id:
            payload["parent_id"] = parent_id
        resp = client.post(f"/api/posts/{post_id}/comments", json=payload, headers=headers)
        assert resp.status_code == 201
        return resp.json()

    # ── Happy paths ──────────────────────────────────────────────────────────

    def test_create_comment_as_reader(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        resp = client.post(f"/api/posts/{post['id']}/comments",
                           json={"content": "Great post!"},
                           headers=reader_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Great post!"
        assert data["post_id"] == post["id"]
        assert data["parent_id"] is None

    def test_create_nested_comment(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        parent = self._create_comment(client, post["id"], reader_headers, "Top level")
        resp = client.post(f"/api/posts/{post['id']}/comments",
                           json={"content": "Nested reply", "parent_id": parent["id"]},
                           headers=author_headers)
        assert resp.status_code == 201
        assert resp.json()["parent_id"] == parent["id"]

    def test_get_comments_returns_only_top_level(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        parent = self._create_comment(client, post["id"], reader_headers)
        self._create_comment(client, post["id"], author_headers,
                             content="Reply", parent_id=parent["id"])
        resp = client.get(f"/api/posts/{post['id']}/comments")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1                     # only top-level
        assert len(items[0]["children"]) == 1      # nested reply is in children

    def test_get_comments_on_nonexistent_post(self, client: TestClient):
        resp = client.get("/api/posts/999999/comments")
        assert resp.status_code == 404

    def test_update_comment_by_owner(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.put(f"/api/comments/{comment['id']}",
                          json={"content": "Edited comment"},
                          headers=reader_headers)
        assert resp.status_code == 200
        assert resp.json()["content"] == "Edited comment"

    def test_update_comment_by_admin(self, client: TestClient, author_headers, reader_headers, admin_headers):
        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.put(f"/api/comments/{comment['id']}",
                          json={"content": "Admin-edited"},
                          headers=admin_headers)
        assert resp.status_code == 200

    def test_delete_comment_by_owner(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.delete(f"/api/comments/{comment['id']}", headers=reader_headers)
        assert resp.status_code == 204

    def test_delete_comment_by_admin(self, client: TestClient, author_headers, reader_headers, admin_headers):
        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.delete(f"/api/comments/{comment['id']}", headers=admin_headers)
        assert resp.status_code == 204

    # ── Access control ────────────────────────────────────────────────────────

    def test_create_comment_unauthenticated(self, client: TestClient, author_headers):
        post = self._create_post(client, author_headers)
        resp = client.post(f"/api/posts/{post['id']}/comments",
                           json={"content": "Anonymous"})
        assert resp.status_code == 401

    def test_update_comment_by_other_user_forbidden(
        self, client: TestClient, author_headers, reader_headers, admin_headers, db_session
    ):
        from app.models.user import User, RoleEnum
        from app.utils.security import hash_password, create_access_token

        other = User(
            username="other_reader",
            email="other_reader@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.reader,
        )
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        other_token = create_access_token({"sub": str(other.id), "role": other.role.value})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.put(f"/api/comments/{comment['id']}",
                          json={"content": "I hacked this"},
                          headers=other_headers)
        assert resp.status_code == 403

    def test_delete_comment_by_other_user_forbidden(
        self, client: TestClient, author_headers, reader_headers, db_session
    ):
        from app.models.user import User, RoleEnum
        from app.utils.security import hash_password, create_access_token

        other = User(
            username="another_reader",
            email="another_reader@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.reader,
        )
        db_session.add(other)
        db_session.commit()
        db_session.refresh(other)
        other_token = create_access_token({"sub": str(other.id), "role": other.role.value})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.delete(f"/api/comments/{comment['id']}", headers=other_headers)
        assert resp.status_code == 403

    def test_comment_on_nonexistent_post(self, client: TestClient, reader_headers):
        resp = client.post("/api/posts/999999/comments",
                           json={"content": "Orphan comment"},
                           headers=reader_headers)
        assert resp.status_code == 404

    def test_nested_comment_cross_post_rejected(
        self, client: TestClient, author_headers, reader_headers
    ):
        """parent_id from a different post must be rejected."""
        post_a = self._create_post(client, author_headers)
        post_b_resp = client.post("/api/posts",
                                  json={"title": "Post B", "content": "body"},
                                  headers=author_headers)
        post_b = post_b_resp.json()
        comment_on_a = self._create_comment(client, post_a["id"], reader_headers)
        resp = client.post(f"/api/posts/{post_b['id']}/comments",
                           json={"content": "Cross-post reply", "parent_id": comment_on_a["id"]},
                           headers=reader_headers)
        assert resp.status_code == 400

    # ── Validation ────────────────────────────────────────────────────────────

    def test_create_comment_empty_content(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        resp = client.post(f"/api/posts/{post['id']}/comments",
                           json={"content": ""},
                           headers=reader_headers)
        assert resp.status_code == 422

    def test_update_comment_empty_content(self, client: TestClient, author_headers, reader_headers):
        post = self._create_post(client, author_headers)
        comment = self._create_comment(client, post["id"], reader_headers)
        resp = client.put(f"/api/comments/{comment['id']}",
                          json={"content": ""},
                          headers=reader_headers)
        assert resp.status_code == 422

    def test_get_nonexistent_comment(self, client: TestClient, reader_headers):
        """Delete a non-existent comment should return 404."""
        resp = client.delete("/api/comments/999999", headers=reader_headers)
        assert resp.status_code == 404


# =============================================================================
# SECTION 4 — USERS (Admin only)
# =============================================================================

class TestUsers:

    def test_list_users_as_admin(self, client: TestClient, test_reader, test_author, admin_headers):
        resp = client.get("/api/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 2

    def test_get_user_by_id_as_admin(self, client: TestClient, test_reader, admin_headers):
        resp = client.get(f"/api/users/{test_reader.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == test_reader.email

    def test_get_nonexistent_user_as_admin(self, client: TestClient, admin_headers):
        resp = client.get("/api/users/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_list_users_as_author_forbidden(self, client: TestClient, author_headers):
        resp = client.get("/api/users", headers=author_headers)
        assert resp.status_code == 403

    def test_list_users_as_reader_forbidden(self, client: TestClient, reader_headers):
        resp = client.get("/api/users", headers=reader_headers)
        assert resp.status_code == 403

    def test_list_users_unauthenticated(self, client: TestClient):
        resp = client.get("/api/users")
        assert resp.status_code == 401

    def test_update_user_role_as_admin(self, client: TestClient, test_reader, admin_headers):
        resp = client.put(f"/api/users/{test_reader.id}/role",
                          json={"role": "author"},
                          headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "author"

    def test_update_user_role_invalid_value(self, client: TestClient, test_reader, admin_headers):
        resp = client.put(f"/api/users/{test_reader.id}/role",
                          json={"role": "superuser"},
                          headers=admin_headers)
        assert resp.status_code == 422

    def test_update_role_as_author_forbidden(self, client: TestClient, test_reader, author_headers):
        resp = client.put(f"/api/users/{test_reader.id}/role",
                          json={"role": "admin"},
                          headers=author_headers)
        assert resp.status_code == 403

    def test_delete_user_as_admin(self, client: TestClient, db_session, admin_headers):
        from app.models.user import User, RoleEnum
        from app.utils.security import hash_password

        victim = User(
            username="victim_user",
            email="victim@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.reader,
        )
        db_session.add(victim)
        db_session.commit()
        db_session.refresh(victim)

        resp = client.delete(f"/api/users/{victim.id}", headers=admin_headers)
        assert resp.status_code == 204
        assert client.get(f"/api/users/{victim.id}", headers=admin_headers).status_code == 404

    def test_delete_user_as_reader_forbidden(self, client: TestClient, test_author, reader_headers):
        resp = client.delete(f"/api/users/{test_author.id}", headers=reader_headers)
        assert resp.status_code == 403

    def test_user_pagination(self, client: TestClient, test_reader, test_author, test_admin, admin_headers):
        resp = client.get("/api/users?page=1&size=2", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) <= 2
        assert data["size"] == 2


# =============================================================================
# SECTION 5 — INFRASTRUCTURE / MISC
# =============================================================================

class TestInfrastructure:

    def test_health_check(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_root_endpoint(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_metrics_endpoint_exposed(self, client: TestClient):
        resp = client.get("/metrics")
        assert resp.status_code == 200
        # Prometheus returns plain text
        assert "http_requests_total" in resp.text or "python_info" in resp.text

    def test_404_returns_json(self, client: TestClient):
        resp = client.get("/api/nonexistent-endpoint")
        assert resp.status_code == 404
        assert resp.headers["content-type"].startswith("application/json")

    def test_422_returns_json(self, client: TestClient, author_headers):
        # Missing required field → 422
        resp = client.post("/api/posts", json={"title": "only title"}, headers=author_headers)
        assert resp.status_code == 422
        body = resp.json()
        # Our custom handler wraps errors
        assert "errors" in body or "detail" in body


# =============================================================================
# SECTION 6 — END-TO-END FLOW
# =============================================================================

class TestEndToEndFlow:
    """
    Full realistic scenario:
    admin promotes reader → author → author posts → reader comments → reply → cleanup.
    """

    def test_full_blog_workflow(self, client: TestClient,
                                test_reader, test_author, test_admin,
                                reader_headers, author_headers, admin_headers):

        # 1. Admin promotes reader to author
        resp = client.put(f"/api/users/{test_reader.id}/role",
                          json={"role": "author"},
                          headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "author"

        # 2. Original author creates a post
        resp = client.post("/api/posts",
                           json={"title": "Hello World", "content": "My first blog post!"},
                           headers=author_headers)
        assert resp.status_code == 201
        post_id = resp.json()["id"]
        assert resp.json()["comment_count"] == 0

        # 3. Reader (now promoted) can also create a post
        resp = client.post("/api/posts",
                           json={"title": "Reader's Post", "content": "I can post now!"},
                           headers=reader_headers)
        assert resp.status_code == 201

        # 4. Anyone (unauthenticated) can read posts
        resp = client.get("/api/posts")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2

        # 5. Reader leaves a comment on author's post
        resp = client.post(f"/api/posts/{post_id}/comments",
                           json={"content": "Great post!"},
                           headers=reader_headers)
        assert resp.status_code == 201
        comment_id = resp.json()["id"]

        # 6. Author replies to the comment
        resp = client.post(f"/api/posts/{post_id}/comments",
                           json={"content": "Thank you!", "parent_id": comment_id},
                           headers=author_headers)
        assert resp.status_code == 201

        # 7. Verify comment structure
        resp = client.get(f"/api/posts/{post_id}/comments")
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["children"][0]["content"] == "Thank you!"

        # 8. Verify comment_count is reflected on post
        resp = client.get(f"/api/posts/{post_id}")
        assert resp.json()["comment_count"] == 2

        # 9. Admin cleans up
        resp = client.delete(f"/api/comments/{comment_id}", headers=admin_headers)
        assert resp.status_code == 204

        resp = client.delete(f"/api/posts/{post_id}", headers=admin_headers)
        assert resp.status_code == 204

        resp = client.get(f"/api/posts/{post_id}")
        assert resp.status_code == 404
