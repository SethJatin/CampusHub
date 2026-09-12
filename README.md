# 🎓 CampusHub

> **A comprehensive full-stack educational platform designed to streamline the academic experience for students and faculty.**

CampusHub is a comprehensive, full-stack educational platform designed to streamline the academic experience for students and faculty. It features a modern, responsive **Single Page Application (SPA)** frontend built with **React** and a robust, secure **REST API** backend built with **Django**.

---

## ✨ Key Features

| Feature                           | Description                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 🔐 **Role-Based Access Control**  | Tailored dashboards and permissions for **Students, Faculty, and Admins**.                           |
| 📚 **Course Management**          | Course creation, subject offerings, enrollment requests, and attendance tracking.                    |
| 📝 **Assignments & Grading**      | Seamless homework posting, drag-and-drop file submissions, and grading.                              |
| 📖 **Study Materials Hub**        | Centralized repository for shared PDF notes with live filterable search, comments, and rating logic. |
| 📢 **Event Announcements**        | Stay up to date with campus events, hackathons, and important announcements.                         |
| 🤖 **AI Risk Analysis Dashboard** | Visual widget for faculty to identify at-risk students based on attendance and assignment scores.    |

---

## 🛠️ Technology Stack

### 🎨 Frontend

* **Framework:** React (Vite)
* **Routing:** React Router (`react-router-dom`)
* **State Management:** React Context (`AuthContext`)
* **Styling:** Modern, responsive glassmorphic UI

### ⚙️ Backend

* **Framework:** Django & Django REST Framework
* **Database:** SQLite3 (for local development & demo)
* **Authentication:** JWT (JSON Web Tokens) for secure, stateless authentication between frontend and backend.
* **Machine Learning:** Custom AI models for student risk analysis (located in `backend/ml/`).

---

## 🏗️ Architecture Overview

The system is split into two primary components communicating via a **REST API**:

```text
                    ┌─────────────────────────┐
                    │       CampusHub         │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
        ┌───────▼────────┐               ┌────────▼────────┐
        │    Frontend    │   REST API    │     Backend     │
        │ React + Vite   │◄─────────────►│ Django + DRF    │
        └────────────────┘               └────────┬────────┘
                                                  │
                         ┌────────────────────────┼─────────────────────┐
                         │                        │                     │
                  ┌──────▼──────┐          ┌──────▼──────┐      ┌──────▼──────┐
                  │  Accounts   │          │   Courses   │      │ Assignments │
                  └─────────────┘          └─────────────┘      └─────────────┘
                         │                        │                     │
                  ┌──────▼──────┐          ┌──────▼──────┐
                  │    Notes    │          │    Events   │
                  └─────────────┘          └─────────────┘
```

### 🎨 Frontend — React

Handles dynamic user interfaces, client-side routing, and token management.

Includes features like:

* Drag-and-drop uploads
* Live filtering
* Dynamic user interfaces
* Client-side routing
* JWT token management

### ⚙️ Backend — Django

Acts as the core engine and organizes logic into specific applications:

| App           | Responsibility                                |
| ------------- | --------------------------------------------- |
| `accounts`    | User roles, authentication, and profiles      |
| `courses`     | Academic subjects, enrollment, and attendance |
| `assignments` | Task creation and submissions                 |
| `notes`       | Study material management                     |
| `events`      | Campus event management                       |

---

## 🚀 Getting Started

### 📋 Prerequisites

Make sure the following are installed:

* **Node.js** — v18+ recommended
* **Python** — v3.9+ recommended

---

## ⚙️ Backend Setup

### 1. Navigate to the Django directory

```bash
cd backend/django
```

### 2. Activate the virtual environment

If `.new_venv` is already created:

```bash
.\.new_venv\Scripts\activate
```

> **Windows users:** The above command activates the existing virtual environment.

Or create a new virtual environment:

```bash
python -m venv .venv
```

Then install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Run the development server

```bash
python manage.py runserver
```

> **Note:** The database is pre-configured with SQLite3 and mock data via `seed_master_data.py`.

---

## 🎨 Frontend Setup

### 1. Navigate to the frontend directory

```bash
cd frontend
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Run the Vite development server

```bash
npm run dev
```

---

## 🌐 Accessing the Application

Once both servers are running, access the frontend application locally:

```text
http://localhost:5173
```

---

## 📂 Project Structure

```text
CampusHub/
│
├── frontend/
│   └── React + Vite application
│
├── backend/
│   └── django/
│       ├── accounts/
│       ├── courses/
│       ├── assignments/
│       ├── notes/
│       ├── events/
│       └── ml/
│
├── ARCHITECTURE_GUIDE.md
└── PROJECT_ARCHITECTURE_EXPLANATION.txt
```

---

## 📚 Documentation

For more detailed architectural insights, please refer to:

* [`ARCHITECTURE_GUIDE.md`](ARCHITECTURE_GUIDE.md)
* [`PROJECT_ARCHITECTURE_EXPLANATION.txt`](PROJECT_ARCHITECTURE_EXPLANATION.txt)

---

<div align="center">

### 🎓 CampusHub

**Connecting Students • Faculty • Courses • Learning**

</div>
```
