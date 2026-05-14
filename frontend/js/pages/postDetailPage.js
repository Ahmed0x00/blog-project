// js/pages/postDetailPage.js — Single post view with comments

import {
  apiGetPost, apiDeletePost,
  apiGetComments, apiCreateComment, apiUpdateComment, apiDeleteComment,
} from '../api.js';
import { showToast } from '../toast.js';
import { relativeTime, formatDate, escapeHtml, confirmModal, setLoading, paginationHtml } from '../utils.js';
import { isLoggedIn, getCurrentUser, getUserRole } from '../session.js';

export async function renderPostDetailPage(container, postId) {
  container.innerHTML = `<div class="page-loader"><div class="spinner-border text-accent" role="status"></div></div>`;

  try {
    const post = await apiGetPost(postId);
    renderPost(container, post);
    await loadComments(postId, 1);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="bi bi-file-x"></i></div>
        <h3>Post not found</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="#/" class="btn btn-ghost mt-2">← Back to Home</a>
      </div>`;
  }
}

function renderPost(container, post) {
  const user    = getCurrentUser();
  const role    = getUserRole();
  const isOwner = user && user.id === post.author_id;
  const isAdmin = role === 'admin';

  const editBtn   = (isOwner || isAdmin)
    ? `<a href="#/posts/${post.id}/edit" class="btn btn-ghost btn-sm me-2" id="edit-post-btn">
         <i class="bi bi-pencil me-1"></i>Edit
       </a>` : '';
  const deleteBtn = (isOwner || isAdmin)
    ? `<button class="btn btn-danger-custom btn-sm" id="delete-post-btn">
         <i class="bi bi-trash me-1"></i>Delete
       </button>` : '';

  const adminBanner = isAdmin
    ? `<div class="admin-banner">
         <i class="bi bi-shield-check"></i>
         You are viewing as Admin — moderation tools active.
       </div>` : '';

  const authorInitials = (post.author?.username || '?').slice(0, 2).toUpperCase();

  container.innerHTML = `
    <div class="fade-in">
      <div class="mb-3">
        <a href="#/" class="btn btn-ghost btn-sm" id="back-home-btn">
          <i class="bi bi-arrow-left me-1"></i>All Posts
        </a>
      </div>
      ${adminBanner}
      <div class="post-detail-header">
        <h1>${escapeHtml(post.title)}</h1>
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <div class="d-flex align-items-center gap-2">
            <div class="avatar-circle lg">${authorInitials}</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(post.author?.username || 'Unknown')}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${formatDate(post.created_at)}</div>
            </div>
          </div>
          <div class="ms-auto d-flex gap-2">
            ${editBtn}${deleteBtn}
          </div>
        </div>
      </div>

      <div class="glass-card p-4 mb-4">
        <div class="post-content-body">${escapeHtml(post.content)}</div>
      </div>

      <!-- Comments Section -->
      <div class="comment-thread">
        <h2 class="fs-4 fw-bold mb-4">
          <i class="bi bi-chat-left-text me-2"></i>Comments
          <span id="comment-total-badge" class="badge ms-2" style="background:rgba(124,58,237,0.2);color:#c4b5fd;font-size:0.75rem;"></span>
        </h2>
        <div id="comment-form-section"></div>
        <div id="comments-list"></div>
        <div id="comments-pagination"></div>
      </div>
    </div>`;

  // Delete post
  document.getElementById('delete-post-btn')?.addEventListener('click', async () => {
    const confirmed = await confirmModal('Delete this post? This action cannot be undone.', 'Delete Post');
    if (!confirmed) return;
    try {
      await apiDeletePost(post.id);
      showToast('Post deleted.', 'success');
      window.location.hash = '#/';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Render comment form
  renderCommentForm(post.id, null);
}

function renderCommentForm(postId, parentId, parentContainerId = 'comment-form-section') {
  if (!isLoggedIn()) {
    const section = document.getElementById(parentContainerId);
    if (section && parentContainerId === 'comment-form-section') {
      section.innerHTML = `
        <div class="glass-card p-3 mb-4 text-center" style="color:var(--text-muted);font-size:0.9rem;">
          <i class="bi bi-lock me-2"></i>
          <a href="#/login">Log in</a> to join the conversation.
        </div>`;
    }
    return;
  }

  const section = document.getElementById(parentContainerId);
  if (!section) return;

  const formId     = `comment-form-${parentId ?? 'root'}`;
  const textareaId = `comment-text-${parentId ?? 'root'}`;
  const submitId   = `comment-submit-${parentId ?? 'root'}`;

  section.innerHTML = `
    <div class="reply-form-wrapper mb-4" id="${formId}">
      <textarea class="form-control mb-2" id="${textareaId}" rows="3"
        placeholder="${parentId ? 'Write a reply…' : 'Share your thoughts…'}"></textarea>
      <div class="d-flex gap-2">
        <button class="btn btn-primary-custom btn-sm" id="${submitId}">
          <i class="bi bi-send me-1"></i>${parentId ? 'Reply' : 'Post Comment'}
        </button>
        ${parentId ? `<button class="btn btn-ghost btn-sm" id="cancel-reply-${parentId}">Cancel</button>` : ''}
      </div>
    </div>`;

  document.getElementById(submitId)?.addEventListener('click', async () => {
    const ta  = document.getElementById(textareaId);
    const btn = document.getElementById(submitId);
    const content = ta?.value.trim();
    if (!content) { showToast('Comment cannot be empty.', 'error'); return; }

    setLoading(btn, true, 'Posting…');
    try {
      await apiCreateComment(postId, content, parentId);
      showToast('Comment posted!', 'success');
      ta.value = '';
      // Reload comments
      await loadComments(postId, 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  });

  if (parentId) {
    document.getElementById(`cancel-reply-${parentId}`)?.addEventListener('click', () => {
      section.innerHTML = '';
    });
  }
}

async function loadComments(postId, page) {
  const listEl  = document.getElementById('comments-list');
  const paginEl = document.getElementById('comments-pagination');
  const badge   = document.getElementById('comment-total-badge');
  if (!listEl) return;

  listEl.innerHTML = `<div class="page-loader py-3"><div class="spinner-border spinner-border-sm text-accent"></div></div>`;

  try {
    const data       = await apiGetComments(postId, page, 20);
    const comments   = data.items       || [];
    const total      = data.total       || 0;
    const totalPages = data.total_pages || 1;

    if (badge) badge.textContent = total;

    if (comments.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state py-3">
          <div class="empty-icon"><i class="bi bi-chat"></i></div>
          <h3 class="fs-5">No comments yet</h3>
          <p>Be the first to comment!</p>
        </div>`;
    } else {
      listEl.innerHTML = comments.map(c => renderCommentHtml(c, postId, 0)).join('');
      attachCommentListeners(listEl, postId);
    }

    if (paginEl) {
      paginEl.innerHTML = paginationHtml(page, totalPages, 'comments-pager');
      paginEl.querySelectorAll('[data-target="comments-pager"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const newPage = parseInt(link.dataset.page);
          if (newPage >= 1 && newPage <= totalPages) loadComments(postId, newPage);
        });
      });
    }
  } catch (err) {
    listEl.innerHTML = `<p class="text-danger small">${escapeHtml(err.message)}</p>`;
  }
}

function renderCommentHtml(comment, postId, depth) {
  const user    = getCurrentUser();
  const role    = getUserRole();
  const isOwner = user && user.id === comment.author_id;
  const isAdmin = role === 'admin';
  const initials = (comment.author?.username || '?').slice(0, 2).toUpperCase();
  const maxDepth = 4;

  const actionBtns = (isOwner || isAdmin) ? `
    ${isOwner ? `<button class="btn-sm-icon edit-comment-btn" data-id="${comment.id}" data-content="${escapeHtml(comment.content)}" title="Edit">
      <i class="bi bi-pencil"></i>
    </button>` : ''}
    <button class="btn-sm-icon danger delete-comment-btn" data-id="${comment.id}" data-post-id="${postId}" title="Delete">
      <i class="bi bi-trash"></i>
    </button>` : '';

  const replyBtn = isLoggedIn()
    ? `<button class="btn-sm-icon reply-btn" data-id="${comment.id}" data-post-id="${postId}" title="Reply">
         <i class="bi bi-reply me-1"></i>Reply
       </button>` : '';

  const children = (comment.children && comment.children.length > 0 && depth < maxDepth)
    ? `<div class="comment-children">${comment.children.map(c => renderCommentHtml(c, postId, depth + 1)).join('')}</div>`
    : '';

  return `
    <div class="comment-item" id="comment-${comment.id}">
      <div class="comment-header">
        <div class="avatar-circle" style="width:24px;height:24px;font-size:0.6rem;">${initials}</div>
        <span class="comment-author">${escapeHtml(comment.author?.username || 'Unknown')}</span>
        <span class="comment-time">${relativeTime(comment.created_at)}</span>
      </div>
      <div class="comment-body" id="comment-body-${comment.id}">${escapeHtml(comment.content)}</div>
      <div id="comment-edit-form-${comment.id}"></div>
      <div class="comment-actions">
        ${replyBtn}
        ${actionBtns}
      </div>
      <div id="reply-form-${comment.id}"></div>
      ${children}
    </div>`;
}

function attachCommentListeners(container, postId) {
  // Reply buttons
  container.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId  = btn.dataset.id;
      const replyFormEl = document.getElementById(`reply-form-${commentId}`);
      if (!replyFormEl) return;
      // Toggle
      if (replyFormEl.innerHTML) { replyFormEl.innerHTML = ''; return; }
      renderCommentForm(postId, parseInt(commentId), `reply-form-${commentId}`);
    });
  });

  // Edit buttons
  container.querySelectorAll('.edit-comment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId  = btn.dataset.id;
      const content    = btn.dataset.content;
      const editFormEl = document.getElementById(`comment-edit-form-${commentId}`);
      const bodyEl     = document.getElementById(`comment-body-${commentId}`);
      if (!editFormEl) return;

      if (editFormEl.innerHTML) { editFormEl.innerHTML = ''; bodyEl.style.display = ''; return; }

      bodyEl.style.display = 'none';
      editFormEl.innerHTML = `
        <textarea class="form-control inline-edit-textarea mb-2" id="edit-ta-${commentId}" rows="3">${escapeHtml(content)}</textarea>
        <div class="d-flex gap-2 mb-1">
          <button class="btn btn-primary-custom btn-sm" id="save-edit-${commentId}">
            <i class="bi bi-check2 me-1"></i>Save
          </button>
          <button class="btn btn-ghost btn-sm" id="cancel-edit-${commentId}">Cancel</button>
        </div>`;

      document.getElementById(`cancel-edit-${commentId}`)?.addEventListener('click', () => {
        editFormEl.innerHTML = '';
        bodyEl.style.display = '';
      });

      document.getElementById(`save-edit-${commentId}`)?.addEventListener('click', async () => {
        const saveBtn = document.getElementById(`save-edit-${commentId}`);
        const newContent = document.getElementById(`edit-ta-${commentId}`)?.value.trim();
        if (!newContent) { showToast('Comment cannot be empty.', 'error'); return; }
        setLoading(saveBtn, true, 'Saving…');
        try {
          await apiUpdateComment(parseInt(commentId), newContent);
          showToast('Comment updated.', 'success');
          await loadComments(postId, 1);
        } catch (err) {
          showToast(err.message, 'error');
          setLoading(saveBtn, false);
        }
      });
    });
  });

  // Delete buttons
  container.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const commentId = parseInt(btn.dataset.id);
      const confirmed = await confirmModal('Delete this comment?', 'Delete Comment');
      if (!confirmed) return;
      try {
        await apiDeleteComment(commentId);
        showToast('Comment deleted.', 'success');
        await loadComments(postId, 1);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
