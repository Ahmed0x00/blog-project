// js/pages/registerPage.js — Registration form

import { apiRegister } from '../api.js';
import { showToast } from '../toast.js';
import { setLoading, escapeHtml } from '../utils.js';

export function renderRegisterPage(container) {
  container.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-card">
        <div class="auth-icon"><i class="bi bi-person-plus"></i></div>
        <h1 class="fs-3 fw-bold mb-1">Create account</h1>
        <p class="text-muted mb-4" style="font-size:0.9rem;">Join BlogSphere and start sharing</p>

        <form id="register-form" novalidate>
          <div class="mb-3">
            <label for="reg-username" class="form-label">Username</label>
            <input type="text" class="form-control" id="reg-username"
                   placeholder="yourname" required minlength="3" maxlength="50" autocomplete="username" />
            <div class="invalid-feedback" id="reg-username-error"></div>
          </div>
          <div class="mb-3">
            <label for="reg-email" class="form-label">Email address</label>
            <input type="email" class="form-control" id="reg-email"
                   placeholder="you@example.com" required autocomplete="email" />
            <div class="invalid-feedback" id="reg-email-error"></div>
          </div>
          <div class="mb-3">
            <label for="reg-password" class="form-label">Password</label>
            <input type="password" class="form-control" id="reg-password"
                   placeholder="Min. 8 characters" required minlength="8" autocomplete="new-password" />
            <div class="invalid-feedback" id="reg-password-error"></div>
          </div>
          <div class="mb-4">
            <label for="reg-confirm" class="form-label">Confirm Password</label>
            <input type="password" class="form-control" id="reg-confirm"
                   placeholder="Repeat password" required autocomplete="new-password" />
            <div class="invalid-feedback" id="reg-confirm-error"></div>
          </div>
          <div id="reg-global-error" class="text-danger small mb-3 d-none"></div>
          <button type="submit" class="btn btn-primary-custom w-100 mb-3" id="reg-submit-btn">
            <i class="bi bi-person-plus me-1"></i>Create Account
          </button>
        </form>

        <p class="text-center mb-0" style="font-size:0.875rem; color:var(--text-muted);">
          Already have an account?
          <a href="#/login" class="ms-1" id="go-to-login-link">Sign in</a>
        </p>
      </div>
    </div>`;

  const form       = document.getElementById('register-form');
  const submitBtn  = document.getElementById('reg-submit-btn');
  const globalErr  = document.getElementById('reg-global-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    let valid = true;

    if (username.length < 3) {
      setFieldError('reg-username', 'reg-username-error', 'Username must be at least 3 characters.');
      valid = false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setFieldError('reg-email', 'reg-email-error', 'Please enter a valid email address.');
      valid = false;
    }
    if (password.length < 8) {
      setFieldError('reg-password', 'reg-password-error', 'Password must be at least 8 characters.');
      valid = false;
    }
    if (password !== confirm) {
      setFieldError('reg-confirm', 'reg-confirm-error', 'Passwords do not match.');
      valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true, 'Creating account…');
    globalErr.classList.add('d-none');

    try {
      await apiRegister(username, email, password);
      showToast('Account created! Please sign in.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      globalErr.textContent = err.message || 'Registration failed.';
      globalErr.classList.remove('d-none');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errorId);
  if (input) input.classList.add('is-invalid');
  if (err)   { err.textContent = msg; err.style.display = 'block'; }
}

function clearErrors() {
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  document.querySelectorAll('.invalid-feedback').forEach(el => { el.textContent = ''; el.style.display = ''; });
  const g = document.getElementById('reg-global-error');
  if (g) g.classList.add('d-none');
}
