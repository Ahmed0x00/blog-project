// js/pages/editPostPage.js — Edit existing blog post

import { apiGetPost, apiUpdatePost } from '../api.js';
import { showToast } from '../toast.js';
import { setLoading, escapeHtml } from '../utils.js';
import { getCurrentUser, getUserRole } from '../session.js';

export async function renderEditPostPage(container, postId) {
  container.innerHTML = `<div class="page-loader"><div class="spinner-border text-accent" role="status"></div></div>`;

  let post;
  try {
    post = await apiGetPost(postId);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="bi bi-file-x"></i></div>
        <h3>Post not found</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="#/" class="btn btn-ghost mt-2">← Back</a>
      </div>`;
    return;
  }

  // Role guard — owner or admin
  const user    = getCurrentUser();
  const role    = getUserRole();
  const isOwner = user && user.id === post.author_id;
  const isAdmin = role === 'admin';

  if (!isOwner && !isAdmin) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="bi bi-shield-x"></i></div>
        <h3>Access Denied</h3>
        <p>You don't have permission to edit this post.</p>
        <a href="#/posts/${postId}" class="btn btn-ghost mt-2">← Back to Post</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="fade-in" style="max-width:760px;margin:0 auto;">
      <div class="mb-4 d-flex align-items-center gap-3">
        <a href="#/posts/${postId}" class="btn btn-ghost btn-sm" id="back-from-edit">
          <i class="bi bi-arrow-left me-1"></i>Cancel
        </a>
        <h1 class="fs-3 fw-bold mb-0">Edit Post</h1>
      </div>

      <div class="glass-card p-4">
        <form id="edit-post-form" novalidate>
          <div class="mb-4">
            <label for="edit-title" class="form-label">Title</label>
            <input type="text" class="form-control" id="edit-title"
                   value="${escapeHtml(post.title)}" maxlength="200" required />
            <div class="char-count"><span id="edit-title-count">${post.title.length}</span>/200</div>
            <div class="text-danger small d-none" id="edit-title-error"></div>
          </div>
          <div class="mb-4">
            <label for="edit-content" class="form-label">Content</label>
            <textarea class="form-control" id="edit-content" rows="14"
                      required style="min-height:280px;">${escapeHtml(post.content)}</textarea>
            <div class="char-count"><span id="edit-content-count">${post.content.length}</span> characters</div>
            <div class="text-danger small d-none" id="edit-content-error"></div>
          </div>
          <div id="edit-global-error" class="text-danger small mb-3 d-none"></div>
          <div class="d-flex gap-3">
            <button type="submit" class="btn btn-primary-custom" id="edit-post-btn">
              <i class="bi bi-check2 me-1"></i>Save Changes
            </button>
            <a href="#/posts/${postId}" class="btn btn-ghost">Cancel</a>
          </div>
        </form>
      </div>
    </div>`;

  // Character counters
  const titleInput   = document.getElementById('edit-title');
  const contentInput = document.getElementById('edit-content');

  titleInput?.addEventListener('input', () => {
    document.getElementById('edit-title-count').textContent = titleInput.value.length;
  });
  contentInput?.addEventListener('input', () => {
    document.getElementById('edit-content-count').textContent = contentInput.value.length;
  });

  // Form submit
  const form      = document.getElementById('edit-post-form');
  const submitBtn = document.getElementById('edit-post-btn');
  const globalErr = document.getElementById('edit-global-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const title   = titleInput.value.trim();
    const content = contentInput.value.trim();
    let valid = true;

    if (!title) {
      showFieldError('edit-title-error', 'Title is required.');
      valid = false;
    }
    if (!content) {
      showFieldError('edit-content-error', 'Content is required.');
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true, 'Saving…');
    globalErr.classList.add('d-none');

    try {
      await apiUpdatePost(postId, title, content);
      showToast('Post updated!', 'success');
      window.location.hash = `#/posts/${postId}`;
    } catch (err) {
      globalErr.textContent = err.message || 'Failed to update post.';
      globalErr.classList.remove('d-none');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function showFieldError(errorId, msg) {
  const el = document.getElementById(errorId);
  if (el) { el.textContent = msg; el.classList.remove('d-none'); }
}

function clearErrors() {
  ['edit-title-error', 'edit-content-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('d-none'); }
  });
}
