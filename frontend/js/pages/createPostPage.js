// js/pages/createPostPage.js — Create new blog post

import { apiCreatePost } from '../api.js';
import { showToast } from '../toast.js';
import { setLoading, escapeHtml } from '../utils.js';

export function renderCreatePostPage(container) {
  container.innerHTML = `
    <div class="fade-in" style="max-width:760px;margin:0 auto;">
      <div class="mb-4 d-flex align-items-center gap-3">
        <a href="#/" class="btn btn-ghost btn-sm" id="back-from-create">
          <i class="bi bi-arrow-left me-1"></i>Cancel
        </a>
        <h1 class="fs-3 fw-bold mb-0">Write a New Post</h1>
      </div>

      <div class="glass-card p-4">
        <form id="create-post-form" novalidate>
          <div class="mb-4">
            <label for="post-title" class="form-label">Title</label>
            <input type="text" class="form-control" id="post-title"
                   placeholder="Enter an engaging title…" maxlength="200" required />
            <div class="char-count"><span id="title-count">0</span>/200</div>
            <div class="text-danger small d-none" id="title-error"></div>
          </div>
          <div class="mb-4">
            <label for="post-content" class="form-label">Content</label>
            <textarea class="form-control" id="post-content" rows="14"
                      placeholder="Share your story…" required style="min-height:280px;"></textarea>
            <div class="char-count"><span id="content-count">0</span> characters</div>
            <div class="text-danger small d-none" id="content-error"></div>
          </div>
          <div id="create-global-error" class="text-danger small mb-3 d-none"></div>
          <div class="d-flex gap-3">
            <button type="submit" class="btn btn-primary-custom" id="create-post-btn">
              <i class="bi bi-send me-1"></i>Publish Post
            </button>
            <a href="#/" class="btn btn-ghost" id="cancel-create-btn">Cancel</a>
          </div>
        </form>
      </div>
    </div>`;

  // Character counters
  const titleInput   = document.getElementById('post-title');
  const contentInput = document.getElementById('post-content');
  const titleCount   = document.getElementById('title-count');
  const contentCount = document.getElementById('content-count');

  titleInput?.addEventListener('input', () => {
    titleCount.textContent = titleInput.value.length;
  });
  contentInput?.addEventListener('input', () => {
    contentCount.textContent = contentInput.value.length;
  });

  // Form submit
  const form      = document.getElementById('create-post-form');
  const submitBtn = document.getElementById('create-post-btn');
  const globalErr = document.getElementById('create-global-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const title   = titleInput.value.trim();
    const content = contentInput.value.trim();
    let valid = true;

    if (!title) {
      showFieldError('title-error', 'Title is required.');
      valid = false;
    } else if (title.length > 200) {
      showFieldError('title-error', 'Title must not exceed 200 characters.');
      valid = false;
    }
    if (!content) {
      showFieldError('content-error', 'Content is required.');
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true, 'Publishing…');
    globalErr.classList.add('d-none');

    try {
      const post = await apiCreatePost(title, content);
      showToast('Post published! 🎉', 'success');
      window.location.hash = `#/posts/${post.id}`;
    } catch (err) {
      globalErr.textContent = err.message || 'Failed to publish post.';
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
  ['title-error', 'content-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('d-none'); }
  });
}
