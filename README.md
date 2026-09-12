# CampusHub

CampusHub is a comprehensive, full-stack educational platform designed to streamline the academic experience for students and faculty. It features a modern, responsive Single Page Application (SPA) frontend built with React and a robust, secure REST API backend built with Django.

## Key Features

- **Role-Based Access Control**: Tailored dashboards and permissions for Students, Faculty, and Admins.
- **Course Management**: Course creation, subject offerings, enrollment requests, and attendance tracking.
- **Assignments & Grading**: Seamless homework posting, drag-and-drop file submissions, and grading.
- **Study Materials Hub**: A centralized repository for shared PDF notes with live filterable search, comments, and rating logic.
- **Event Announcements**: Stay up to date with campus events, hackathons, and important announcements.
- **AI Risk Analysis Dashboard**: Visual widget for faculty to identify at-risk students based on attendance and assignment scores.

## Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Routing**: React Router (`react-router-dom`)
- **State Management**: React Context (`AuthContext`)
- **Styling**: Modern, responsive glassmorphic UI

### Backend
- **Framework**: Django & Django REST Framework
- **Database**: SQLite3 (for local development & demo)
- **Authentication**: JWT (JSON Web Tokens) for secure, stateless authentication between frontend and backend.
- **Machine Learning**: Custom AI models for student risk analysis (located in `backend/ml/`).

## Architecture Overview

The system is split into two primary components communicating via a REST API:

1.  **Frontend (React)**: Handles dynamic user interfaces, client-side routing, and token management. Includes features like drag-and-drop uploads and live filtering.
2.  **Backend (Django)**: Acts as the core engine. Organizes logic into specific apps:
    - `accounts`: User roles, authentication, and profiles.
    - `courses`: Academic subjects, enrollment, and attendance.
    - `assignments`: Task creation and submissions.
    - `notes`: Study material management.
    - `events`: Campus event management.

For more detailed architectural insights, please refer to the `ARCHITECTURE_GUIDE.md` and `PROJECT_ARCHITECTURE_EXPLANATION.txt` in this repository.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python (3.9+ recommended)

### Backend Setup

1. Navigate to the Django directory:
   ```bash
   cd backend/django
   ```
2. Activate the virtual environment (if it's already created as `.new_venv`):
   ```bash
   .\.new_venv\Scripts\activate   # On Windows
   ```
   *(Or create a new one using `python -m venv .venv` and install dependencies with `pip install -r requirements.txt`)*
3. Run the development server:
   ```bash
   python manage.py runserver
   ```

*(Note: The database is pre-configured with SQLite3 and mock data via `seed_master_data.py`).*

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

### Accessing the Application
Once both servers are running, access the frontend application locally (usually at `http://localhost:5173`).
