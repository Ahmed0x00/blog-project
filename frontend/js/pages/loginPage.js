// js/pages/loginPage.js — Login form

import { apiLogin } from '../api.js';
import { showToast } from '../toast.js';
import { setLoading, escapeHtml } from '../utils.js';
import { renderNavbar } from '../navbar.js';

export function renderLoginPage(container) {
  container.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-card">
        <div class="auth-icon"><i class="bi bi-box-arrow-in-right"></i></div>
        <h1 class="fs-3 fw-bold mb-1">Welcome back</h1>
        <p class="text-muted mb-4" style="font-size:0.9rem;">Sign in to your account to continue</p>

        <form id="login-form" novalidate>
          <div class="mb-3">
            <label for="login-email" class="form-label">Email address</label>
            <input type="email" class="form-control" id="login-email"
                   placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="mb-3">
            <label for="login-password" class="form-label">Password</label>
            <div class="input-group">
              <input type="password" class="form-control border-end-0" id="login-password"
                     placeholder="••••••••" required autocomplete="current-password" />
              <button class="btn btn-ghost border border-start-0" type="button" id="toggle-pw"
                      aria-label="Show/hide password" style="border-radius:0 var(--radius-sm) var(--radius-sm) 0;">
                <i class="bi bi-eye" id="toggle-pw-icon"></i>
              </button>
            </div>
          </div>
          <div id="login-error" class="text-danger small mb-3 d-none"></div>
          <button type="submit" class="btn btn-primary-custom w-100 mb-3" id="login-submit-btn">
            <i class="bi bi-box-arrow-in-right me-1"></i>Sign In
          </button>
        </form>

        <p class="text-center mb-0" style="font-size:0.875rem; color:var(--text-muted);">
          Don't have an account?
          <a href="#/register" class="ms-1" id="go-to-register-link">Create one</a>
        </p>
      </div>
    </div>`;

  // Toggle password visibility
  const toggleBtn  = document.getElementById('toggle-pw');
  const pwInput    = document.getElementById('login-password');
  const toggleIcon = document.getElementById('toggle-pw-icon');

  toggleBtn?.addEventListener('click', () => {
    const shown = pwInput.type === 'text';
    pwInput.type = shown ? 'password' : 'text';
    toggleIcon.className = shown ? 'bi bi-eye' : 'bi bi-eye-slash';
  });

  // Form submit
  const form    = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showError(errorEl, 'Please enter your email and password.');
      return;
    }

    setLoading(submitBtn, true, 'Signing in…');
    errorEl.classList.add('d-none');

    try {
      await apiLogin(email, password);
      renderNavbar();
      showToast('Welcome back! 👋', 'success');
      window.location.hash = '#/';
    } catch (err) {
      showError(errorEl, err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('d-none');
}
