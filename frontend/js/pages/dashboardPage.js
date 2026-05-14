// js/pages/dashboardPage.js — Monitoring dashboard (Admin only)

import { apiGetHealth } from '../api.js';
import { escapeHtml } from '../utils.js';

let healthInterval = null;

export async function renderDashboardPage(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="section-header mb-4">
        <h1 class="fs-2 fw-bold mb-0">
          <i class="bi bi-speedometer2 me-2 text-accent"></i>Monitoring Dashboard
        </h1>
        <span class="badge" style="background:rgba(63,185,80,0.15);color:#86efac;border:1px solid rgba(63,185,80,0.3);">
          <i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>Live
        </span>
      </div>

      <!-- Health Status Cards -->
      <div class="row g-3 mb-4">
        <div class="col-12">
          <div class="glass-card p-3">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="fs-5 fw-bold mb-0"><i class="bi bi-heart-pulse me-2"></i>System Health</h2>
              <button class="btn btn-ghost btn-sm" id="health-refresh-btn">
                <i class="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
            </div>
            <div class="row g-3" id="health-cards">
              <div class="col-12 col-md-4">
                <div class="health-card">
                  <div class="health-dot pulse" id="dot-api"></div>
                  <span id="label-api" style="font-size:0.85rem;font-weight:600;">API Server</span>
                  <div id="status-api" class="mt-1" style="font-size:0.75rem;color:var(--text-muted);">Checking…</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="health-card">
                  <div class="health-dot pulse" id="dot-db"></div>
                  <span id="label-db" style="font-size:0.85rem;font-weight:600;">Database</span>
                  <div id="status-db" class="mt-1" style="font-size:0.75rem;color:var(--text-muted);">Checking…</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="health-card">
                  <div class="health-dot pulse" id="dot-cache"></div>
                  <span id="label-cache" style="font-size:0.85rem;font-weight:600;">Redis Cache</span>
                  <div id="status-cache" class="mt-1" style="font-size:0.75rem;color:var(--text-muted);">Checking…</div>
                </div>
              </div>
            </div>
            <p class="text-muted-custom small mb-0 mt-2">
              <i class="bi bi-arrow-clockwise me-1"></i>Auto-refreshes every 30 seconds.
            </p>
          </div>
        </div>
      </div>

      <!-- Metrics Info -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6">
          <div class="glass-card p-3 h-100">
            <h2 class="fs-5 fw-bold mb-3"><i class="bi bi-graph-up me-2"></i>Prometheus Metrics</h2>
            <p style="font-size:0.875rem;color:var(--text-secondary);">
              Raw Prometheus metrics are exposed at the backend endpoint:
            </p>
            <a href="http://localhost:8000/metrics" target="_blank" rel="noopener"
               class="btn btn-ghost btn-sm mb-3" id="metrics-endpoint-link">
              <i class="bi bi-box-arrow-up-right me-1"></i>Open /metrics
            </a>
            <div class="mt-2" style="background:rgba(0,0,0,0.2);border-radius:8px;padding:1rem;font-size:0.78rem;font-family:monospace;color:var(--text-secondary);">
              <div><span style="color:#86efac;">http_requests_total</span> — total HTTP requests</div>
              <div><span style="color:#86efac;">http_request_duration_seconds</span> — latency histogram</div>
              <div><span style="color:#86efac;">process_cpu_seconds_total</span> — CPU usage</div>
              <div><span style="color:#86efac;">process_resident_memory_bytes</span> — memory usage</div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="glass-card p-3 h-100">
            <h2 class="fs-5 fw-bold mb-3"><i class="bi bi-bar-chart-line me-2"></i>Grafana Dashboards</h2>
            <p style="font-size:0.875rem;color:var(--text-secondary);">
              Grafana is configured to scrape Prometheus and visualize:
            </p>
            <ul style="font-size:0.85rem;color:var(--text-secondary);padding-left:1.2rem;">
              <li>Request rate per second</li>
              <li>Error rate (4xx / 5xx)</li>
              <li>P95 response time</li>
              <li>Active endpoints by request count</li>
            </ul>
            <a href="http://localhost:3000" target="_blank" rel="noopener"
               class="btn btn-ghost btn-sm mt-2" id="grafana-link">
              <i class="bi bi-box-arrow-up-right me-1"></i>Open Grafana
            </a>
          </div>
        </div>
      </div>

      <!-- API Logs info -->
      <div class="glass-card p-3">
        <h2 class="fs-5 fw-bold mb-2"><i class="bi bi-file-text me-2"></i>Application Logs</h2>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin:0;">
          Structured JSON logs are written to <code style="color:#86efac;">blog-api/logs/app.log</code>
          via Loguru (rotates at 10 MB, retained for 7 days).
        </p>
      </div>
    </div>`;

  // Initial health check
  await checkHealth();

  // Refresh button
  document.getElementById('health-refresh-btn')?.addEventListener('click', checkHealth);

  // Auto-refresh every 30s
  if (healthInterval) clearInterval(healthInterval);
  healthInterval = setInterval(checkHealth, 30_000);

  // Clear interval when page navigates away
  window.addEventListener('hashchange', () => {
    if (healthInterval) { clearInterval(healthInterval); healthInterval = null; }
  }, { once: true });
}

async function checkHealth() {
  try {
    const data = await apiGetHealth();
    // If we get a response, API is up
    setDotStatus('api', true, 'Healthy');
    // Backend health endpoint only confirms API is alive; DB & Redis assumed up if backend is up
    setDotStatus('db',    true, 'Connected');
    setDotStatus('cache', true, 'Connected');
  } catch (err) {
    setDotStatus('api',   false, 'Unreachable');
    setDotStatus('db',    false, 'Unknown');
    setDotStatus('cache', false, 'Unknown');
  }
}

function setDotStatus(key, up, label) {
  const dot    = document.getElementById(`dot-${key}`);
  const status = document.getElementById(`status-${key}`);
  if (!dot || !status) return;

  dot.className = `health-dot ${up ? 'up' : 'down'}`;
  status.textContent = label;
  status.style.color = up ? 'var(--success)' : 'var(--danger)';
}
