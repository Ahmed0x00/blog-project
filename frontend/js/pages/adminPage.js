// js/pages/adminPage.js — Admin panel (users + posts management)

import { apiGetUsers, apiDeleteUser, apiUpdateUserRole, apiGetPosts, apiDeletePost } from '../api.js';
import { showToast } from '../toast.js';
import { escapeHtml, confirmModal, formatDate, paginationHtml, relativeTime, truncate } from '../utils.js';

export async function renderAdminPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="section-header mb-4">
        <h1 class="fs-2 fw-bold mb-0">
          <i class="bi bi-shield-lock me-2 text-accent"></i>Admin Panel
        </h1>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-4" id="admin-tabs" role="tablist" style="border-color:var(--border-subtle);">
        <li class="nav-item">
          <button class="nav-link active" id="tab-users" data-bs-toggle="tab" data-bs-target="#panel-users"
                  type="button" role="tab" style="color:var(--text-secondary);">
            <i class="bi bi-people me-1"></i>Users
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" id="tab-posts" data-bs-toggle="tab" data-bs-target="#panel-posts"
                  type="button" role="tab" style="color:var(--text-secondary);">
            <i class="bi bi-journal-text me-1"></i>Posts
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- Users Panel -->
        <div class="tab-pane fade show active" id="panel-users" role="tabpanel">
          <div class="glass-card overflow-hidden">
            <div class="admin-section-title">
              <i class="bi bi-people"></i>User Management
            </div>
            <div id="users-table-wrapper">
              <div class="page-loader py-4"><div class="spinner-border text-accent"></div></div>
            </div>
            <div id="users-pagination" class="px-3 pb-3"></div>
          </div>
        </div>

        <!-- Posts Panel -->
        <div class="tab-pane fade" id="panel-posts" role="tabpanel">
          <div class="glass-card overflow-hidden">
            <div class="admin-section-title">
              <i class="bi bi-journal-text"></i>Post Moderation
            </div>
            <div id="posts-table-wrapper">
              <div class="page-loader py-4"><div class="spinner-border text-accent"></div></div>
            </div>
            <div id="admin-posts-pagination" class="px-3 pb-3"></div>
          </div>
        </div>
      </div>
    </div>`;

  // Override tab link styles on active
  document.querySelectorAll('#admin-tabs .nav-link').forEach(link => {
    link.addEventListener('shown.bs.tab', () => {
      document.querySelectorAll('#admin-tabs .nav-link').forEach(l => l.style.color = 'var(--text-secondary)');
      link.style.color = 'var(--text-primary)';
    });
  });

  await loadUsersTable(1);

  // Lazy load posts panel on tab click
  document.getElementById('tab-posts')?.addEventListener('shown.bs.tab', async () => {
    const wrapper = document.getElementById('posts-table-wrapper');
    if (wrapper && wrapper.querySelector('.spinner-border')) {
      await loadPostsTable(1);
    }
  });
}

// ── Users Table ────────────────────────────────────────────────
async function loadUsersTable(page) {
  const wrapper = document.getElementById('users-table-wrapper');
  const paginEl = document.getElementById('users-pagination');
  if (!wrapper) return;

  wrapper.innerHTML = `<div class="page-loader py-4"><div class="spinner-border text-accent"></div></div>`;

  try {
    const data       = await apiGetUsers(page, 15);
    const users      = data.items       || [];
    const totalPages = data.total_pages || 1;

    if (users.length === 0) {
      wrapper.innerHTML = `<div class="empty-state py-3"><p>No users found.</p></div>`;
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table class="table mb-0" id="users-table">
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr data-user-id="${u.id}">
                <td class="text-muted-custom">#${u.id}</td>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td class="text-muted-custom">${escapeHtml(u.email)}</td>
                <td>
                  <select class="form-select form-select-sm role-select"
                          data-user-id="${u.id}"
                          style="width:auto;background:transparent;color:var(--text-secondary);border-color:var(--border-subtle);">
                    <option value="reader"  ${u.role === 'reader'  ? 'selected' : ''}>Reader</option>
                    <option value="author"  ${u.role === 'author'  ? 'selected' : ''}>Author</option>
                    <option value="admin"   ${u.role === 'admin'   ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
                <td class="text-muted-custom">${relativeTime(u.created_at)}</td>
                <td>
                  <button class="btn-sm-icon danger delete-user-btn" data-user-id="${u.id}" title="Delete user">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Role change
    wrapper.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const userId = parseInt(sel.dataset.userId);
        const role   = sel.value;
        try {
          await apiUpdateUserRole(userId, role);
          showToast(`Role updated to ${role}.`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Delete user
    wrapper.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId    = parseInt(btn.dataset.userId);
        const confirmed = await confirmModal('Delete this user? This cannot be undone.', 'Delete User');
        if (!confirmed) return;
        try {
          await apiDeleteUser(userId);
          showToast('User deleted.', 'success');
          await loadUsersTable(page);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    if (paginEl) {
      paginEl.innerHTML = paginationHtml(page, totalPages, 'users-pager');
      paginEl.querySelectorAll('[data-target="users-pager"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const newPage = parseInt(link.dataset.page);
          if (newPage >= 1 && newPage <= totalPages) loadUsersTable(newPage);
        });
      });
    }
  } catch (err) {
    wrapper.innerHTML = `<p class="text-danger p-3">${escapeHtml(err.message)}</p>`;
  }
}

// ── Posts Table ────────────────────────────────────────────────
async function loadPostsTable(page) {
  const wrapper = document.getElementById('posts-table-wrapper');
  const paginEl = document.getElementById('admin-posts-pagination');
  if (!wrapper) return;

  wrapper.innerHTML = `<div class="page-loader py-4"><div class="spinner-border text-accent"></div></div>`;

  try {
    const data       = await apiGetPosts(page, 15);
    const posts      = data.items       || [];
    const totalPages = data.total_pages || 1;

    if (posts.length === 0) {
      wrapper.innerHTML = `<div class="empty-state py-3"><p>No posts found.</p></div>`;
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table class="table mb-0">
          <thead>
            <tr>
              <th>ID</th><th>Title</th><th>Author</th><th>Comments</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map(p => `
              <tr>
                <td class="text-muted-custom">#${p.id}</td>
                <td>
                  <a href="#/posts/${p.id}" style="color:var(--text-primary);font-weight:600;">
                    ${escapeHtml(truncate(p.title, 60))}
                  </a>
                </td>
                <td class="text-muted-custom">${escapeHtml(p.author?.username || '?')}</td>
                <td>${p.comment_count || 0}</td>
                <td class="text-muted-custom">${relativeTime(p.created_at)}</td>
                <td>
                  <button class="btn-sm-icon danger delete-admin-post-btn" data-post-id="${p.id}" title="Delete post">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Delete post
    wrapper.querySelectorAll('.delete-admin-post-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId    = parseInt(btn.dataset.postId);
        const confirmed = await confirmModal('Delete this post and all its comments?', 'Delete Post');
        if (!confirmed) return;
        try {
          await apiDeletePost(postId);
          showToast('Post deleted.', 'success');
          await loadPostsTable(page);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    if (paginEl) {
      paginEl.innerHTML = paginationHtml(page, totalPages, 'admin-posts-pager');
      paginEl.querySelectorAll('[data-target="admin-posts-pager"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const newPage = parseInt(link.dataset.page);
          if (newPage >= 1 && newPage <= totalPages) loadPostsTable(newPage);
        });
      });
    }
  } catch (err) {
    wrapper.innerHTML = `<p class="text-danger p-3">${escapeHtml(err.message)}</p>`;
  }
}
