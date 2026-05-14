// js/toast.js — Toast notification system

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };

  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;

  container.appendChild(el);

  // Auto-dismiss after 4s
  const timeout = setTimeout(() => dismiss(el), 4000);

  // Click to dismiss early
  el.addEventListener('click', () => { clearTimeout(timeout); dismiss(el); });
}

function dismiss(el) {
  el.classList.add('slide-out');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
