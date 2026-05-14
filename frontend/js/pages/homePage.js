// js/pages/homePage.js — Blog post listing with pagination

import { apiGetPosts } from '../api.js';
import { relativeTime, truncate, escapeHtml, avatarHtml, paginationHtml } from '../utils.js';
import { isLoggedIn, getUserRole } from '../session.js';

let currentPage = 1;

export async function renderHomePage(container) {
  // Hero
  const role     = getUserRole();
  const loggedIn = isLoggedIn();

  const heroBtn = (role === 'author' || role === 'admin')
    ? `<a href="#/posts/new" class="btn btn-primary-custom me-2" id="hero-new-post-btn">
         <i class="bi bi-plus-lg me-1"></i>Write a Post
       </a>`
    : (!loggedIn
        ? `<a href="#/register" class="btn btn-primary-custom me-2" id="hero-register-btn">
             <i class="bi bi-pencil-square me-1"></i>Start Writing
           </a>`
        : '');

  container.innerHTML = `
    <div class="hero-section slide-up">
      <h1>Welcome to <span class="gradient-text">BlogSphere</span></h1>
      <p class="lead">Discover stories, ideas, and perspectives from writers around the world.</p>
      <div class="d-flex justify-content-center gap-2 flex-wrap">
        ${heroBtn}
        <button class="btn btn-ghost" id="hero-explore-btn">
          <i class="bi bi-compass me-1"></i>Explore Posts
        </button>
      </div>
    </div>

    <div id="posts-section">
      <div class="section-header">
        <h2 id="posts-section-title">Latest Posts</h2>
      </div>
      <div id="posts-grid" class="row g-3 mb-4">
        ${skeletonCards()}
      </div>
      <div id="posts-pagination"></div>
    </div>`;

  document.getElementById('hero-explore-btn')?.addEventListener('click', () => {
    document.getElementById('posts-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  await loadPosts(currentPage);
}

async function loadPosts(page) {
  const grid       = document.getElementById('posts-grid');
  const paginEl    = document.getElementById('posts-pagination');
  const titleEl    = document.getElementById('posts-section-title');
  if (!grid) return;

  grid.innerHTML = skeletonCards();

  try {
    const data = await apiGetPosts(page, 9);
    const posts = data.items || [];
    const total       = data.total      || 0;
    const totalPages  = data.total_pages || 1;

    if (titleEl) titleEl.textContent = `Latest Posts (${total})`;

    if (posts.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-icon"><i class="bi bi-journal-x"></i></div>
            <h3>No posts yet</h3>
            <p>Be the first to write something!</p>
          </div>
        </div>`;
    } else {
      grid.innerHTML = posts.map(post => postCardHtml(post)).join('');
      // Attach click listeners
      grid.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.hash = `#/posts/${card.dataset.postId}`;
        });
      });
    }

    if (paginEl) {
      paginEl.innerHTML = paginationHtml(page, totalPages, 'posts-pager');
      paginEl.querySelectorAll('[data-target="posts-pager"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const newPage = parseInt(link.dataset.page);
          if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            loadPosts(currentPage);
            document.getElementById('posts-section')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>
          <h3>Failed to load posts</h3>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-ghost mt-2" id="retry-posts-btn"><i class="bi bi-arrow-clockwise me-1"></i>Retry</button>
        </div>
      </div>`;
    document.getElementById('retry-posts-btn')?.addEventListener('click', () => loadPosts(page));
  }
}

function postCardHtml(post) {
  const initials = (post.author?.username || '?').slice(0, 2).toUpperCase();
  return `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="post-card fade-in" data-post-id="${post.id}" role="button" tabindex="0"
           aria-label="Read: ${escapeHtml(post.title)}">
        <div class="post-title">${escapeHtml(post.title)}</div>
        <div class="post-excerpt">${escapeHtml(truncate(post.content, 160))}</div>
        <div class="post-meta mt-auto">
          <div class="meta-author">
            <div class="avatar-circle" style="width:24px;height:24px;font-size:0.6rem;">${initials}</div>
            <span>${escapeHtml(post.author?.username || 'Unknown')}</span>
          </div>
          <span>·</span>
          <span>${relativeTime(post.created_at)}</span>
          <span class="ms-auto comment-count">
            <i class="bi bi-chat"></i> ${post.comment_count || 0}
          </span>
        </div>
      </div>
    </div>`;
}

function skeletonCards() {
  return Array(6).fill('').map(() => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="skeleton-card">
        <div class="skeleton mb-3" style="height:20px;width:80%;"></div>
        <div class="skeleton mb-2" style="height:14px;width:100%;"></div>
        <div class="skeleton mb-2" style="height:14px;width:90%;"></div>
        <div class="skeleton"      style="height:14px;width:60%;"></div>
      </div>
    </div>`).join('');
}
