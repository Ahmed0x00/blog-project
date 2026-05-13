# Part 2: Frontend Implementation Plan

> [!IMPORTANT]
> This plan assumes the backend from Part 1 is fully operational. The frontend is a **Vite + Vanilla JS** single-page application that consumes the FastAPI REST API.

---

## Phase 0: Project Setup & Design System
### Steps

1. **Initialize the Vite project:**
   ```bash
   npx -y create-vite@latest ./ --template vanilla
   npm install
   ```

2. **Project structure:**
   ```
   frontend/
   ├── index.html
   ├── src/
   │   ├── main.js            # App entry, router initialization
   │   ├── router.js           # Client-side SPA router
   │   ├── api/                # API client modules
   │   │   ├── client.js       # Base fetch wrapper (attaches JWT, handles errors)
   │   │   ├── auth.js         # login(), register(), getMe()
   │   │   ├── posts.js        # getPosts(), getPost(), createPost(), etc.
   │   │   ├── comments.js     # getComments(), createComment(), etc.
   │   │   └── monitoring.js   # getHealth(), (optional direct metric calls)
   │   ├── auth/               # Auth state management
   │   │   └── session.js      # Token storage, role getter, login state checks
   │   ├── components/         # Reusable UI component renderers
   │   │   ├── navbar.js
   │   │   ├── postCard.js
   │   │   ├── postForm.js
   │   │   ├── commentThread.js
   │   │   ├── pagination.js
   │   │   ├── roleGuard.js
   │   │   └── toast.js
   │   ├── pages/              # Page renderers (each is a function)
   │   │   ├── homePage.js
   │   │   ├── loginPage.js
   │   │   ├── registerPage.js
   │   │   ├── postDetailPage.js
   │   │   ├── createPostPage.js
   │   │   ├── editPostPage.js
   │   │   ├── adminPanel.js
   │   │   └── dashboardPage.js
   │   └── utils/
   │       ├── dom.js          # DOM helper utilities
   │       └── formatters.js   # Date formatting, truncation
   ├── public/
   │   └── favicon.svg
   └── style.css               # Global design system
   ```

3. **Design system in `style.css`:**
   - CSS custom properties for a dark-mode-first palette (e.g., deep slate backgrounds, vibrant accent gradients).
   - Typography: Import `Inter` from Google Fonts. Define heading/body scales.
   - Glassmorphism utility classes (backdrop blur, translucent backgrounds).
   - Micro-animation classes: fade-in, slide-up, skeleton loaders.
   - Responsive grid and container utilities.
   - Form input styles, button variants (primary, danger, ghost), card styles.

4. **Git branch:** `feature/frontend-setup` → merge to `develop`.

---

## Phase 1: API Client & Authentication State
**Mapped Requirement:** `Frontend #1 — Authentication & State`

### 1A — API Client (`src/api/client.js`)

1. Create a `fetchAPI(endpoint, options)` wrapper that:
   - Prepends the base URL (`http://localhost:8000/api`).
   - Automatically attaches `Authorization: Bearer <token>` header if a token exists.
   - Sets `Content-Type: application/json`.
   - Parses JSON responses.
   - Handles error responses: extracts `detail` from error body, throws typed errors.
   - On `401` response → clear session, redirect to login.

### 1B — Session Management (`src/auth/session.js`)

1. **Token storage:** Store JWT in `localStorage` under key `blog_token`.

   > [!NOTE]
   > For a university project, `localStorage` is acceptable. In production, `httpOnly` cookies would be preferred. Document this trade-off in the README.

2. **Exported functions:**
   - `saveToken(token)` — store token.
   - `getToken() → string | null` — retrieve token.
   - `removeToken()` — clear token (logout).
   - `isLoggedIn() → boolean` — check if token exists and is not expired.
   - `getCurrentUser() → { id, username, email, role } | null` — decode JWT payload (base64) to extract user data. **Do not verify signature client-side** — the server handles that.
   - `getUserRole() → "admin" | "author" | "reader" | null`.

### 1C — Auth API Module (`src/api/auth.js`)

1. `register(username, email, password)` → POST `/auth/register`.
2. `login(email, password)` → POST `/auth/login` → on success, call `saveToken()`.
3. `getMe()` → GET `/auth/me` (used to refresh user state on page load).

### 1D — Router with Auth Guards (`src/router.js`)

1. Implement a hash-based SPA router (`window.onhashchange`).
2. Route definitions:

   | Route | Page | Auth Required | Allowed Roles |
   |-------|------|---------------|---------------|
   | `#/` | Home (post list) | ❌ | All |
   | `#/login` | Login | ❌ (redirect if logged in) | — |
   | `#/register` | Register | ❌ (redirect if logged in) | — |
   | `#/posts/:id` | Post Detail | ❌ | All |
   | `#/posts/new` | Create Post | ✅ | Author, Admin |
   | `#/posts/:id/edit` | Edit Post | ✅ | Owner, Admin |
   | `#/admin` | Admin Panel | ✅ | Admin |
   | `#/dashboard` | Monitoring Dashboard | ✅ | Admin |

3. **Route guards:** Before rendering a protected page, check `isLoggedIn()` and `getUserRole()`. If unauthorized → redirect to `#/login` with a toast message.

**Branch:** `feature/frontend-auth` → merge to `develop`.

---

## Phase 2: Core Layout & Navigation
### Steps

1. **Navbar (`src/components/navbar.js`):**
   - Renders dynamically based on auth state:
     - **Logged out:** Logo, Home, Login, Register links.
     - **Reader:** Logo, Home, Profile dropdown (username + logout).
     - **Author:** + "New Post" button.
     - **Admin:** + "Admin Panel" link, + "Dashboard" link.
   - Sticky top navigation with glassmorphism styling.
   - Mobile hamburger menu for responsive design.

2. **Main layout in `index.html`:**
   ```html
   <div id="app">
     <nav id="navbar"></nav>
     <main id="page-content"></main>
     <div id="toast-container"></div>
   </div>
   ```

3. **Toast notifications (`src/components/toast.js`):**
   - `showToast(message, type)` — types: `success`, `error`, `info`.
   - Auto-dismiss after 4 seconds with slide-out animation.

**Branch:** `feature/frontend-layout` → merge to `develop`.

---

## Phase 3: Post Listing & Pagination
**Mapped Requirement:** `Frontend #3 — Blog pagination`

### Steps

1. **Home Page (`src/pages/homePage.js`):**
   - On load, call `GET /posts?page=1&size=10`.
   - Render posts as styled cards in a responsive grid.
   - Each card shows: title, author name, creation date, excerpt (first 150 chars), comment count.
   - Click navigates to `#/posts/{id}`.
   - Skeleton loaders shown while fetching.

2. **Post Card (`src/components/postCard.js`):**
   - Hover effect (subtle lift + shadow enhancement).
   - Author avatar placeholder (colored circle with initial).
   - Time displayed as relative ("3 hours ago") using `src/utils/formatters.js`.

3. **Pagination (`src/components/pagination.js`):**
   - Renders page navigation: Previous, numbered pages, Next.
   - Highlights current page.
   - Disables Previous on page 1, Next on last page.
   - Calls parent's `onPageChange(newPage)` callback to re-fetch.

**Branch:** `feature/frontend-posts-list` → merge to `develop`.

---

## Phase 4: Post Detail & Threaded Comments
**Mapped Requirement:** `Frontend #3 — Threaded/nested comment rendering`

### Steps

1. **Post Detail Page (`src/pages/postDetailPage.js`):**
   - Fetch `GET /posts/{id}` and render full post content.
   - Show author info, date, full content (rendered as formatted text).
   - **Conditional buttons (role-based):**
     - If current user is the post author → show "Edit" and "Delete" buttons.
     - If current user is admin → show "Delete" button.
     - Otherwise → no action buttons.
   - Below the post, render the comment section.

2. **Comment Thread (`src/components/commentThread.js`):**
   - Fetch `GET /posts/{id}/comments?page=1&size=20`.
   - Render comments in a **threaded/nested tree structure:**
     - Top-level comments displayed normally.
     - Child comments indented with a visual thread line (left border).
     - Each comment shows: author, relative timestamp, content.
     - "Reply" button on each comment → reveals inline reply form.
     - Depth limit: visually indent up to 4 levels; deeper replies flatten.
   - **Recursive rendering function:**
     ```
     renderComment(comment) →
       render comment body
       for each comment.children → renderComment(child) with increased indent
     ```
   - **Conditional action buttons:**
     - Comment owner → "Edit", "Delete" buttons.
     - Admin → "Delete" button.
   - Pagination for top-level comments.

3. **Comment form:**
   - Visible only to logged-in users.
   - Text area + "Post Comment" button.
   - For replies: smaller inline form that appears below the parent comment.
   - On submit → POST `/posts/{post_id}/comments` (with optional `parent_id`).
   - On success → re-fetch comments, show success toast.

**Branch:** `feature/frontend-post-detail` → merge to `develop`.

---

## Phase 5: Content Creation & Editing Forms
**Mapped Requirement:** `Frontend #3 — Content creation forms`

### Steps

1. **Create Post Page (`src/pages/createPostPage.js`):**
   - Route guard: Author or Admin only.
   - Form: Title input, Content textarea (large, with character count).
   - Client-side validation: title required (max 200 chars), content required.
   - On submit → POST `/posts` → redirect to `#/posts/{new_id}` on success.
   - Loading state on submit button.

2. **Edit Post Page (`src/pages/editPostPage.js`):**
   - Route guard: Owner or Admin.
   - Pre-populate form with existing post data (`GET /posts/{id}`).
   - On submit → PUT `/posts/{id}` → redirect to post detail.
   - "Cancel" button → navigate back.

3. **Inline Comment Editing:**
   - Click "Edit" on a comment → the comment text becomes an editable textarea.
   - "Save" and "Cancel" buttons appear.
   - On save → PUT `/comments/{id}` → re-render comment.

4. **Delete Confirmations:**
   - All delete actions trigger a modal confirmation dialog.
   - "Are you sure you want to delete this [post/comment]? This action cannot be undone."
   - On confirm → DELETE request → re-fetch data, show success toast.

**Branch:** `feature/frontend-forms` → merge to `develop`.

---

## Phase 6: Role-Based UI Rendering
**Mapped Requirement:** `Frontend #2 — Role-Based UI`

### Steps

1. **`src/components/roleGuard.js`:**
   - `renderIfRole(roles, renderFn)` — only calls `renderFn()` if current user's role is in the `roles` array. Otherwise returns empty string/null.
   - Used throughout all pages to conditionally render elements.

2. **Dynamic rendering rules:**

   | UI Element | Admin | Author | Reader | Guest |
   |------------|-------|--------|--------|-------|
   | "New Post" nav button | ✅ | ✅ | ❌ | ❌ |
   | Edit/Delete on own post | ✅ | ✅ | — | — |
   | Delete on any post | ✅ | ❌ | ❌ | ❌ |
   | Comment form | ✅ | ✅ | ✅ | ❌ (show "Login to comment") |
   | Edit/Delete own comment | ✅ | ✅ | ✅ | — |
   | Delete any comment | ✅ | ❌ | ❌ | ❌ |
   | Admin Panel link | ✅ | ❌ | ❌ | ❌ |
   | Dashboard link | ✅ | ❌ | ❌ | ❌ |

3. **Visual cues:**
   - Role badge next to username in navbar (e.g., colored "Admin" / "Author" pill).
   - Admin sees a subtle banner on post detail: "You are viewing as Admin — moderation tools active."

**Branch:** `feature/frontend-rbac` → merge to `develop`.

---

## Phase 7: Admin Panel
### Steps

1. **Admin Panel Page (`src/pages/adminPanel.js`):**
   - **Users table:** Fetched from `GET /users`. Columns: ID, Username, Email, Role, Created At, Actions.
     - Action: Change role (dropdown: reader ↔ author ↔ admin) → PUT `/users/{id}/role`.
     - Action: Delete user → DELETE `/users/{id}` (with confirmation).
   - **Posts table:** List all posts with "Delete" action for moderation.
   - **Comments table (optional):** Flagged/recent comments for moderation.
   - Table pagination for each section.
   - Search/filter functionality (client-side filtering is acceptable).

**Branch:** `feature/frontend-admin` → merge to `develop`.

---

## Phase 8: Monitoring Dashboard
**Mapped Requirement:** `Frontend #4 — Monitoring Integration`

### Steps

1. **Dashboard Page (`src/pages/dashboardPage.js`):**
   - Route guard: Admin only.
   - **Approach: Embed Grafana panels via iframes.**
     - Grafana supports sharing panels as embeddable iframes.
     - Configure Grafana to allow anonymous viewing for embedded panels, or use auth tokens.
     - Embed 4-6 key panels from the Grafana dashboard provisioned in the backend:

   | Panel | Metric Visualized |
   |-------|-------------------|
   | Request Rate | Requests per second over time (line chart) |
   | Error Rate | 4xx and 5xx responses over time |
   | Response Time (P95) | 95th percentile latency (gauge/line) |
   | Cache Hit Ratio | Hits vs misses (pie chart or percentage) |
   | System Health | Uptime, DB/Redis status |
   | Active Endpoints | Top endpoints by request count |

2. **Health check card:**
   - Call `GET /api/health` and display status indicators (green/red dots) for:
     - API Server: ✅ Healthy
     - Database: ✅ Connected
     - Redis Cache: ✅ Connected
   - Auto-refresh every 30 seconds.

3. **Styling:**
   - Dashboard-style grid layout.
   - Dark theme consistent with the app.
   - Cards with subtle glassmorphism borders.

**Branch:** `feature/frontend-dashboard` → merge to `develop`.

---

## Phase 9: Login & Register Pages
### Steps

1. **Login Page (`src/pages/loginPage.js`):**
   - Centered card with glassmorphism effect.
   - Email + Password fields with validation.
   - "Login" button with loading spinner.
   - Link to register page.
   - On success → redirect to `#/` (home) with welcome toast.
   - On failure → show error toast with server message.

2. **Register Page (`src/pages/registerPage.js`):**
   - Username, Email, Password, Confirm Password fields.
   - Client-side validation: email format, password length (min 8), passwords match.
   - On success → auto-login or redirect to `#/login` with success toast.
   - On failure → show field-specific error messages.

**Branch:** `feature/frontend-auth-pages` → merge to `develop`.

---

## Phase 10: Polish & Responsive Design
### Steps

1. **Responsive breakpoints:**
   - Desktop (>1024px): Multi-column grid for posts.
   - Tablet (768-1024px): 2-column grid.
   - Mobile (<768px): Single column, hamburger nav, full-width cards.

2. **Loading states:**
   - Skeleton loaders on all data-fetching pages.
   - Disabled buttons with spinners during form submissions.
   - Empty state illustrations ("No posts yet — be the first to write!").

3. **Animations:**
   - Page transition fade-ins.
   - Card hover lift effects.
   - Toast slide-in/slide-out.
   - Comment thread expand animation.
   - Button press micro-interaction.

4. **Accessibility:**
   - Proper `aria-labels` on interactive elements.
   - Keyboard navigation support.
   - Focus visible outlines.
   - Semantic HTML elements throughout.

5. **SEO & Meta:**
   - Descriptive `<title>` tag (dynamic per page).
   - Meta description.
   - Proper heading hierarchy (`<h1>` per page).

**Branch:** `feature/frontend-polish` → merge to `develop`.

---

## Phase 11: Final Frontend Integration
### Steps
1. End-to-end manual testing of all user flows:
   - Guest browsing → Register → Login → Create post → Comment → Nested reply.
   - Author editing/deleting own content.
   - Admin moderation flows.
   - Dashboard loads metrics.
2. Merge `develop` → `main`.
3. Update `README.md` with frontend setup instructions and screenshots.
4. Final `docker-compose` integration: serve frontend via nginx or Vite preview.
