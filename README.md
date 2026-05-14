# BlogSphere - Blog Management System

Welcome to the **BlogSphere** university project! This is a modern, responsive Single Page Application (SPA) blog platform featuring role-based access control (RBAC), commenting, and administrative moderation.

This guide will walk you through downloading, setting up, and running both the backend and frontend on **Windows 11**.

---

## 🚀 Quick Start Guide (Windows 11)

### 1. Download the Project
Open a terminal (Command Prompt or PowerShell) and run:
```cmd
git clone https://github.com/Ahmed0x00/blog-project.git
cd blog-project
```

### 2. Start the Backend API (FastAPI)
You need to start the backend server so the frontend can retrieve data.

Open a terminal in the `blog-project` folder and run the following commands one by one:
```cmd
cd blog-api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*Leave this terminal window open! The backend must stay running.*

### 3. Start the Frontend (UI)
Now you need to start the frontend server. 

**Open a NEW terminal window** (do not close the backend one), navigate to the project folder again, and run:
```cmd
cd blog-project\frontend
python -m http.server 3000
```
*Leave this terminal open too.*

### 4. View the Website
Open your web browser (Chrome, Edge, etc.) and go to:
👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

You should now see the beautiful BlogSphere website!

---

## 🧪 Test Accounts

The project comes with a pre-configured database (`test.db`) containing different user roles. You can log in using these accounts to test the Role-Based Access Control (RBAC):

**1. Admin Account** (Full access, moderation tools, admin dashboard)
* **Email:** `admin@test.com`
* **Password:** `password123`

**2. Author Account** (Can create, edit, and delete their own posts/comments)
* **Email:** `author@test.com`
* **Password:** `password123`

**3. Reader Account** (Can only read posts and write comments)
* **Email:** `reader@test.com`
* **Password:** `password123`

---

## 🛠️ Features Included
* **Authentication:** JWT-based login/registration system.
* **Role-Based Access Control (RBAC):** Distinct permissions for Admin, Author, and Reader.
* **RESTful API:** Built with FastAPI, SQLite, and SQLAlchemy.
* **Modern UI:** Vanilla JS + Bootstrap + CSS Glassmorphism design system.
* **Dynamic Content:** Nested comments, pagination, and real-time form validation.
* **Admin Dashboard:** Manage users, change roles, moderate posts, and view system health.

