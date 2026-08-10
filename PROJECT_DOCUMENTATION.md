# JAJR Facial Recognition Attendance System - Project Documentation

## System Architecture

The JAJR Facial Recognition system is composed of three main components:
1. **Backend (Node.js/Express)**
2. **Frontend (React/Vite)**
3. **Mobile App (React Native/Expo)**

### 1. Backend (`/backend`)
- **Framework**: Express.js (Node.js)
- **Database**: MySQL (using `mysql2`) & Redis (for caching, via `redis`)
- **Key Features**:
  - Real-time communication via `socket.io` (e.g., chat, live attendance tracking).
  - Security with `helmet`, `cors`, and `express-rate-limit`.
  - Authentication via `jsonwebtoken` (JWT) and `bcryptjs`.
- **API Overview**:
  - `/api/users`: User management
  - `/api/attendance`: Handling check-ins/outs
  - `/api/admin`: Administrative functions
  - `/api/employees`: Employee data management
  - `/api/reports`: Report generation
  - `/api/audit`: Audit logging
  - `/api/dashboard`: Dashboard statistics
  - `/api/assistant`: Virtual assistant endpoints
  - `/api/chat`: Chat features

### 2. Frontend (`/frontend`)
- **Framework**: React 18, built with Vite.
- **Styling**: Tailwind CSS, PostCSS.
- **Key Libraries**:
  - `face-api.js`: Core facial recognition engine in the browser.
  - `react-router-dom`: Routing.
  - `recharts`: Charting and data visualization.
  - `socket.io-client`: Real-time updates from backend.
  - `jspdf` & `xlsx`: Exporting reports.
- **Testing**: Vitest, React Testing Library.

### 3. Mobile App (`/mobile`)
- **Framework**: React Native using Expo (v54).
- **Navigation**: React Navigation (Native Stack, Bottom Tabs).
- **State Management**: Zustand.
- **Key Features**:
  - `expo-camera`: For capturing facial data.
  - `expo-sqlite`: For offline local data storage (useful for offline attendance syncing).
  - `axios`: For API requests to the backend.

## Database Schema Highlights
Database used: `facial_attendance_db`

### Core Tables
1. **`admins`**: Stores administrative users, passwords (bcrypt), and roles (e.g., Superadmin).
2. **`attendance_logs`**: Logs check-in/out records (`IN`, `OUT`) tied to a `user_id` with a timestamp. Optimized with multiple indexes.
3. **`audit_logs`**: Tracks actions performed by admins and employees (e.g., `LOGIN`, `CHECK_IN`), recording IP address, user agent, old/new values.
4. **`notifications`**: Stores email/sms/in-app notifications and their statuses (`pending`, `sent`, `failed`).
*(Additional tables likely exist for employees, chat messages, etc.)*

## Deployment & Environments
- **Environment Variables**: Managed via `.env` files (e.g., `PORT`, `JWT_SECRET`, `FRONTEND_URL`).
- **Deployment Plan**: See `DEPLOYMENT_PLAN.md` in the root directory for further details.
