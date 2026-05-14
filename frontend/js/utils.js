// js/utils.js — Shared helper utilities

/**
 * Relative time formatter ("3 hours ago", "just now")
 */
export function relativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60)   return 'just now';
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHr < 24)    return `${diffHr}h ago`;
  if (diffDay < 30)   return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Full date format
 */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Truncate text to maxLen chars
 */
export function truncate(text, maxLen = 150) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;
}

/**
 * Get initials from a username (first 1–2 chars)
 */
export function getInitials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Render avatar circle HTML
 */
export function avatarHtml(username, size = '') {
  return `<div class="avatar-circle ${size}">${escapeHtml(getInitials(username))}</div>`;
}

/**
 * Build pagination HTML
 */
export function paginationHtml(currentPage, totalPages, onPageId) {
  if (totalPages <= 1) return '';
  let items = '';

  items += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage - 1}" data-target="${onPageId}">&laquo;</a>
  </li>`;

  for (let i = 1; i <= totalPages; i++) {
    items += `<li class="page-item ${i === currentPage ? 'active' : ''}">
      <a class="page-link" href="#" data-page="${i}" data-target="${onPageId}">${i}</a>
    </li>`;
  }

  items += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage + 1}" data-target="${onPageId}">&raquo;</a>
  </li>`;

  return `<nav><ul class="pagination justify-content-center mt-3">${items}</ul></nav>`;
}

/**
 * Show confirmation modal. Returns a Promise<boolean>.
 */
export function confirmModal(message, title = 'Confirm Delete') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const labelEl = document.getElementById('confirmModalLabel');
    const bodyEl  = document.getElementById('confirmModalBody');
    const okBtn   = document.getElementById('confirmModalOk');

    if (!modal) { resolve(false); return; }

    labelEl.textContent = title;
    bodyEl.textContent  = message;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    bsModal.show();

    const handler = () => {
      bsModal.hide();
      resolve(true);
      okBtn.removeEventListener('click', handler);
    };
    okBtn.addEventListener('click', handler);

    modal.addEventListener('hidden.bs.modal', () => {
      okBtn.removeEventListener('click', handler);
      resolve(false);
    }, { once: true });
  });
}

/**
 * Set button loading state
 */
export function setLoading(btn, loading, text = '') {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> ${text || 'Loading…'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || text;
  }
}
