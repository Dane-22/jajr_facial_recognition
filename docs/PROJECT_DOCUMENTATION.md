# Face Recognition Attendance System — Project Documentation

> **Comprehensive System Guide & Technical Specification**  
> Written for non-technical managers, HR staff, and business owners, as well as software engineers and system administrators.  
> **Last updated:** July 2026

---

## Table of Contents

1. [Executive Summary & Layman's Overview](#1-executive-summary--laymans-overview)
   - [What is this System?](#what-is-this-system)
   - [Real-World Analogy: The Smart Digital Receptionist](#real-world-analogy-the-smart-digital-receptionist)
   - [Key Business Benefits](#key-business-benefits)
2. [How the System Works: Non-Technical User Guides](#2-how-the-system-works-non-technical-user-guides)
   - [2.1 For Employees: The Kiosk Screen Experience](#21-for-employees-the-kiosk-screen-experience)
   - [2.2 For HR & Administrators: The Admin Portal](#22-for-hr--administrators-the-admin-portal)
3. [Plain-English Technology Glossary](#3-plain-english-technology-glossary)
4. [Data Privacy, Safety & Ethics](#4-data-privacy-safety--ethics)
5. [System Architecture & Data Flow](#5-system-architecture--data-flow)
6. [Tech Stack & Infrastructure Specifications](#6-tech-stack--infrastructure-specifications)
7. [Repository Directory & File Structure](#7-repository-directory--file-structure)
8. [Core System Features Breakdown](#8-core-system-features-breakdown)
   - [Public Attendance Kiosk](#public-attendance-kiosk)
   - [Admin Management Portal](#admin-management-portal)
   - [Attendance Decision Rules](#attendance-decision-rules)
   - [Face Recognition Confidence Thresholds](#face-recognition-confidence-thresholds)
9. [Database Schema & Entity Relationship](#9-database-schema--entity-relationship)
10. [Complete API Reference](#10-complete-api-reference)
11. [Authentication & Security Audit](#11-authentication--security-audit)
12. [Real-Time Messaging & Performance Optimizations](#12-real-time-messaging--performance-optimizations)
13. [Setup & Installation Guide](#13-setup--installation-guide)
14. [System Configuration & Port Mapping](#14-system-configuration--port-mapping)
15. [Automated Testing Suite & Standards](#15-automated-testing-suite--standards)
16. [Known Limitations & Troubleshooting](#16-known-limitations--troubleshooting)
17. [Multi-Phase Project Roadmap](#17-multi-phase-project-roadmap)
18. [Related Project Documentation](#18-related-project-documentation)

---

## 1. Executive Summary & Layman's Overview

### What is this System?

The **Face Recognition Attendance System** is an automated employee time-tracking platform. It combines a live camera kiosk mounted at an office entrance with a secure administrative dashboard for management. 

Instead of forcing staff to manually punch physical timecards, swipe ID badges, or sign paper attendance sheets, employees simply step in front of a camera screen. The system instantly recognizes their face, greets them by name via voice confirmation, and records their exact check-in or check-out time in a central database.

```
┌─────────────────────────┐        ┌─────────────────────────┐
│     ENTRANCE KIOSK      │        │      ADMIN PORTAL       │
│   (Camera + Display)    │───────►│  (HR & Manager Web App) │
│ - Scans employee face   │        │ - Live attendance tables│
│ - Speaks audio greeting │        │ - Employee management   │
│ - Logs IN / OUT event   │        │ - PDF / Excel reports   │
└─────────────────────────┘        └─────────────────────────┘
```

### Real-World Analogy: The Smart Digital Receptionist

Imagine hiring a super-efficient receptionist who remembers every single employee's facial features. 

1. **Step Up:** When an employee walks up to the front door, the receptionist looks at them.
2. **Recognition:** Rather than pulling out a photo album, the receptionist checks a mental list of mathematical face measurements.
3. **Confirmation:** Once 100% sure, the receptionist says out loud, *"Welcome, Jane Doe!"* and makes a timestamped entry in the company logbook.
4. **Instant Notification:** The receptionist instantly alerts HR upstairs that Jane has arrived for work.

### Key Business Benefits

* 🚫 **Prevents "Buddy Punching":** Employees cannot punch in for absent colleagues because attendance strictly requires physical facial verification.
* ⚡ **Zero Physical Contact:** Hygienic, fast, and completely touchless—ideal for modern office environments.
* ⏱️ **Eliminates Manual Data Entry:** Saves HR staff hours of manual spreadsheet work at the end of every payroll cycle.
* 📊 **Instant Workplace Visibility:** Management can view who is currently present in the building in real time from any authorized browser.
* 🔐 **Full Accountability & Audit Trails:** Every administrative action (registering new staff, updating records, deleting accounts) is logged with timestamp, IP address, and user history.

---

## 2. How the System Works: Non-Technical User Guides

### 2.1 For Employees: The Kiosk Screen Experience

The attendance kiosk runs on a standard tablet, monitor, or computer positioned at the workplace entrance with an attached webcam.

```
┌─────────────────────────────────────────────────────────────┐
│  CAMERA FEED OVERLAY                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │          [ Green Box: DANIEL RILLERA (98%) ]          │  │
│  │                   Holding 3s... (2/3)                 │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Status Card:                                               │
│  🟢 Recognized: DANIEL RILLERA | Status: CHECKED IN         │
│  🔊 "Welcome DANIEL RILLERA, Check-In logged at 8:30 AM"    │
└─────────────────────────────────────────────────────────────┘
```

#### Everyday Workflow:

1. **Approach the Camera:** Stand naturally in front of the kiosk screen (roughly 2 to 4 feet away).
2. **Look at the Visual Box:** The camera feed draws a bounding box around your face with a status color:
   * 🔵 **Blue Box (Scanning):** The system sees a face and is analyzing measurements.
   * 🟢 **Green Box (Recognized & Verifying):** You are recognized! A 3-second countdown timer starts to make sure you are standing still.
   * 🟡 **Yellow Box (Low Confidence):** The system sees a partial match but is not confident enough (e.g., extreme angle or poor lighting). Step closer or adjust lighting.
   * 🔴 **Red Box (Unknown Face):** The face is not registered in the system database.
3. **Audio Confirmation:** Once verified, the kiosk plays a friendly spoken voice message: *"Welcome [Your Name]! Checked In at [Time]."*
4. **Automatic Timecard Selection:** You do not need to press any buttons to choose "IN" or "OUT". The system automatically figures it out:
   * **First scan of the day:** Logs you **IN**.
   * **Second scan (after 15 minutes):** Logs you **OUT**.
   * **Scan after a long break (>12 hours):** Starts a new shift and logs you **IN**.
   * **Scan within 15 minutes of your last log:** Skipped automatically to prevent accidental duplicate punches.

---

### 2.2 For HR & Administrators: The Admin Portal

Administrators access the dashboard via a web browser at `http://localhost:3000/admin/login`.

#### Default Credentials (Development):
* **Username:** `admin`
* **Password:** `password123`

> [!IMPORTANT]
> Change the default administrator password immediately upon deploying the system to production.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ADMIN PORTAL DASHBOARD                                                    │
│ ┌────────────┬───────────┬──────────────┬─────────┬─────────┬───────────┐ │
│ │ Daily Logs │ Employees │ Register Face│ Reports │ Audit   │ Analytics │ │
│ └────────────┴───────────┴──────────────┴─────────┴─────────┴───────────┘ │
│                                                                           │
│ Real-Time Feed: Live stream of check-ins updating automatically!         │
│ Report Export: Generate 1-click PDF or Excel summaries for payroll.       │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Admin Tasks Made Simple:

#### 1. Registering a New Employee's Face
1. Log into the Admin Portal and click the **Register Face** tab.
2. Enter the employee's **Full Name** and **Employee ID / Department Code** (e.g., `ENG-2026-0012`).
3. Click **Start Camera** and ask the employee to face the webcam.
4. Click **Capture Face**. The system extracts their mathematical face vector and saves the profile.

#### 2. Viewing Daily Attendance & Live Activity
* Open the **Daily Logs** tab to view today's check-ins and check-outs.
* Filters allow you to search by employee name, status (IN/OUT), or specific date ranges.
* Thanks to real-time communication, new attendance events land on your screen instantly without requiring you to refresh the browser page.

#### 3. Generating Reports for Payroll
* Click the **Reports** tab.
* Choose between **Daily**, **Weekly**, or **Monthly** summary views.
* Click **Export to Excel** (.xlsx) or **Export to PDF** to download formatted reports ready for payroll processing.

#### 4. System Audit Trail & Security
* Open the **Audit Logs** tab to see a complete history of system activity.
* Every administrative action (logins, adding/deleting employees, editing profiles) is saved with details of who performed the action, when, and from which IP address.

---

## 3. Plain-English Technology Glossary

To help non-technical stakeholders understand how the software works under the hood, here is a simple translation of terms:

| Technical Term | Plain-English Explanation | What it does in this project |
| :--- | :--- | :--- |
| **Frontend (React & Vite)** | **The Visual User Interface** | The visual screens, kiosk layout, buttons, tables, and camera display you interact with. |
| **Backend (Node.js & Express)** | **The System Engine** | The background server software running behind the scenes that processes requests and handles business rules. |
| **Database (MySQL)** | **The Digital Filing Cabinet** | The organized storage vault where employee profiles, attendance timestamps, and audit logs are safely kept. |
| **Facial AI (face-api.js)** | **The Smart Vision Engine** | An artificial intelligence program that runs directly in the browser camera feed to detect faces and compute features. |
| **Face Descriptor / Vector** | **The Digital Face Fingerprint** | A list of 128 numbers measuring unique facial ratios (eyes, nose, jawline). **Not an image file.** |
| **Real-Time Pipeline (Socket.IO)** | **The Instant News Wire** | A direct phone line connecting the entrance camera kiosk to the admin screen so check-ins appear instantly. |
| **Cache (Redis & Node-Cache)** | **Fast Short-Term Memory** | A temporary storage layer that remembers recent queries so the server doesn't get slowed down by duplicate database requests. |
| **JWT (JSON Web Token)** | **Digital VIP Pass** | A secure, encrypted digital badge issued to administrators upon login to grant access to sensitive management screens. |
| **Automated Testing (Playwright)** | **Virtual Quality Inspectors** | Automated software robots that simulate human clicks and camera scans to verify that everything works properly before release. |

---

## 4. Data Privacy, Safety & Ethics

A common concern with facial recognition systems is privacy and raw photo storage. This project enforces strict **Privacy by Design**:

```
RAW CAMERA IMAGE                     MATHEMATICAL EMBEDDING                    DATABASE STORAGE
┌─────────────────┐                  ┌─────────────────────────┐               ┌─────────────────┐
│                 │  Face Detection  │ [ 0.1245, -0.0982,      │ Save Numbers    │   USERS TABLE   │
│   (Live Video)  │─────────────────►│   0.3114, ..., 0.0551 ] │────────────────►│ face_descriptor │
│                 │                  └─────────────────────────┘               │   (TEXT JSON)   │
└─────────────────┘                     128-Dimensional Vector                 └─────────────────┘
                                   *(Cannot be turned back into a photo)*
```

### Key Privacy Features:

1. **No Stored Face Photos:** The system does **NOT** store raw facial photos, JPEGs, or video recordings in the database.
2. **One-Way Mathematical Signatures:** During face registration, the system converts the face into a list of 128 mathematical numbers (a 128-dimensional vector).
3. **Irreversible Vector:** It is mathematically impossible to reconstruct a person's photo or visual image from these 128 numbers. It behaves exactly like a cryptographic hash or digital fingerprint.
4. **Local Browser Processing:** Face detection occurs locally inside the user's web browser client. Live camera feeds are never streamed or uploaded across the public internet.

---

## 5. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT (BROWSER)                                     │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │             KIOSK SCREEN (/)             │  │      ADMIN PORTAL (/admin/*)       │  │
│  │ - WebCam feed & canvas overlays          │  │ - Daily Logs & Employee CRUD       │  │
│  │ - face-api.js local AI models            │  │ - Attendance Reports & Analytics   │  │
│  │ - Audio speech feedback engine           │  │ - Real-time Socket.IO listener     │  │
│  └────────────────────┬─────────────────────┘  └──────────────────┬─────────────────┘  │
└───────────────────────┼───────────────────────────────────────────┼────────────────────┘
                        │ HTTP REST APIs & WebSockets               │ JWT Headers
                        ▼                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVER (Node.js/Express)                          │
│                                        Port 5000                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: CORS | Rate Limiter | JWT Auth Verification | express-validator       │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Controllers: Admin | Attendance | Employee | User | Audit | Reports | Dashboard  │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Real-Time Broadcasting: Socket.IO Server emits 'attendance:new' to admin-room     │  │
│  └────────────────────────────────────────┬─────────────────────────────────────────┘  │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │ Pool Connection / Redis Cache
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   STORAGE & CACHING LAYER                              │
│  ┌────────────────────────────────────────┐   ┌────────────────────────────────────┐  │
│  │       MySQL / MariaDB Database         │   │            REDIS CACHE             │  │
│  │  Tables: users, attendance_logs,       │   │ In-memory speed layer (fallback    │  │
│  │          admins, audit_logs            │   │ to node-cache if uninstalled)      │  │
│  └────────────────────────────────────────┘   └────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Attendance Verification Data Flow:

1. **Load AI Models:** The kiosk browser downloads AI model files (`tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`).
2. **Fetch User Vectors:** The browser requests active employee face signatures via `GET /api/users`.
3. **Continuous Detection Loop:** The camera checks video frames every **~150 milliseconds**.
4. **Distance Matching:** When a face is detected, it calculates the mathematical distance between the live face and registered vectors.
5. **Dwell Verification:** If the match distance is **< 0.4 (High Confidence)**, a 3-second stationary countdown timer activates.
6. **Log Generation:** Upon timer completion, the browser submits `POST /api/attendance/log`.
7. **Database & Audit Write:** The backend inserts the attendance log, updates audit records, and emits a live `attendance:new` event over WebSockets to all connected admin dashboards.

---

## 6. Tech Stack & Infrastructure Specifications

### Frontend Application
* **Framework:** React (v18.x)
* **Build Tool & Dev Server:** Vite (v5.x)
* **Styling & Design System:** Tailwind CSS (v3.x)
* **Client-Side Routing:** React Router DOM (v7.x)
* **Facial Recognition Engine:** face-api.js (v0.22.x)
* **Real-Time Client:** socket.io-client (v4.x)
* **Data Visualization & Charts:** Recharts (v3.x)
* **Report Generation:** jsPDF (v4.x) & xlsx (v0.18.x)

### Backend API Server
* **Runtime Environment:** Node.js (v14+)
* **Application Framework:** Express (v4.x)
* **Database Driver:** mysql2 (v3.x) with connection pooling
* **Real-Time WebSocket Server:** Socket.IO (v4.x)
* **In-Memory Caching:** Redis client (v4.x) with fallback to `node-cache` (v5.x)
* **Security & Auth:** jsonwebtoken (v9.x) & bcryptjs (v3.x)
* **Request Validation & Rate Limiting:** express-validator (v7.x) & express-rate-limit (v8.x)

### Testing & Infrastructure
* **End-to-End & API Testing:** Playwright (v1.x)
* **Database Engine:** MySQL 5.7+ / MariaDB (WAMP Server compatible)

---

## 7. Repository Directory & File Structure

```
face_recog/
├── backend/
│   ├── config/
│   │   ├── db.js                    # MySQL connection pool configuration
│   │   └── redis.js                 # Redis client initialization & fallback logic
│   ├── controllers/
│   │   ├── adminController.js       # Admin authentication & JWT token generation
│   │   ├── attendanceController.js  # Attendance logging, anti-spam & query engine
│   │   ├── auditController.js       # System audit trail queries & filter logic
│   │   ├── dashboardController.js   # Analytics aggregation & dashboard metrics
│   │   ├── employeeController.js    # Employee CRUD operations
│   │   ├── reportController.js      # Daily, weekly & monthly report aggregators
│   │   └── userController.js        # Face descriptor registration & vector listing
│   ├── middleware/
│   │   ├── audit.js                 # Helper to write structured audit records
│   │   ├── authMiddleware.js        # Express JWT token verification middleware
│   │   ├── cache.js                 # Redis / node-cache middleware wrapper
│   │   ├── rateLimiter.js           # API request rate limiting middleware
│   │   └── validation.js            # Input payload sanitization & validation
│   ├── migrations/
│   │   └── create_audit_logs.sql    # Audit logs SQL migration script
│   ├── routes/                      # Express REST API routes (7 route modules)
│   ├── facial_attendance_db.sql     # Canonical database dump & seed records
│   ├── seedAdmin.js                 # Admin account bootstrap script
│   ├── server.js                    # Express + Socket.IO entry point
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── models/                  # Optional local face-api model weights
│   ├── src/
│   │   ├── components/              # React UI views and admin modules
│   │   │   ├── AdminLayout.jsx      # Admin tab shell navigation
│   │   │   ├── AdminLogin.jsx       # Admin login screen
│   │   │   ├── AttendanceCard.jsx   # Kiosk status card & speech logic
│   │   │   ├── AttendanceReports.jsx# Report view & Excel/PDF export buttons
│   │   │   ├── CameraFeed.jsx       # Webcam view, overlay canvas & dwell timer
│   │   │   ├── DailyLogs.jsx        # Today's attendance filterable data table
│   │   │   ├── DashboardCharts.jsx  # Recharts trend analytics & heat maps
│   │   │   ├── EmployeeList.jsx     # Staff directory, search & re-capture
│   │   │   └── RegisterFace.jsx     # New staff registration camera wizard
│   │   ├── hooks/
│   │   │   └── useSocket.js         # Socket.IO hook for real-time admin sync
│   │   ├── utils/
│   │   │   ├── cameraManager.js     # Camera stream lifecycle & motion detection
│   │   │   └── faceApiLoader.js     # Model downloader & FaceMatcher initializer
│   │   ├── App.jsx                  # Main router setup & kiosk layout
│   │   └── main.jsx
│   ├── vite.config.js               # Development proxy & build settings
│   └── package.json
├── tests/                           # Playwright automated test suites
│   ├── api/                         # API endpoint integration tests
│   ├── e2e/                         # Browser UI end-to-end tests
│   └── fixtures/test-data.js        # Test constants & mock payloads
├── PROJECT_DOCUMENTATION.md         # Master system documentation (this file)
├── README.md                        # Quickstart summary & data-testid standards
└── package.json                     # Root Playwright test execution scripts
```

---

## 8. Core System Features Breakdown

### Public Attendance Kiosk (`/`)

* **Live Webcam Overlay:** Draws color-coded face bounding boxes and confidence scores over the video feed.
* **Smart Dwell Verification:** Requires the employee to stay in front of the camera for **3 consecutive seconds** before triggering attendance.
* **Audio Speech Confirmation:** Utilizes the Web Speech API to speak verbal greetings (*"Welcome [Name]"* or *"Goodbye [Name]"*).
* **Power-Saving Idle Mode:** Camera stream automatically pauses after 30 seconds of inactivity to reduce CPU/GPU usage; wakes up automatically when motion is detected.

### Admin Management Portal (`/admin/dashboard`)

| Tab View | Primary Component | Business Capability |
| :--- | :--- | :--- |
| **Daily Logs** | `DailyLogs` | Filterable table showing all check-ins/outs recorded today with instant live updates. |
| **Employee List** | `EmployeeList` | Full employee management (Search, Filter by Department/Role, Edit, Delete, Re-capture Face). |
| **Register Face** | `RegisterFace` | Step-by-step camera wizard to add new staff and capture their facial vector. |
| **Attendance Audit** | `AttendanceAudit` | Deep historical lookup across all attendance records with date-range filters. |
| **Reports** | `AttendanceReports` | Aggregate daily, weekly, and monthly attendance reports with 1-click **PDF** & **Excel** exports. |
| **Audit Logs** | `AuditLogs` | Security oversight log displaying who performed changes, when, and from what IP address. |
| **Analytics** | `DashboardCharts` | Visual charts showing peak check-in hours, department breakdown, and attendance trends. |

### Attendance Decision Rules

The system applies business logic on both client and server to guarantee accurate timecard entries:

```
                  ┌─────────────────────────────────────────┐
                  │          FACE VERIFIED AT KIOSK         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                         Is there a prior log today?
                        /                           \
                       NO                           YES
                      /                               \
                     ▼                                 ▼
              Log status: IN             Time since last log?
                                         /        │         \
                                  > 12 hours   15m - 12h   < 15 minutes
                                      │           │             │
                                      ▼           ▼             ▼
                                  Log: IN    Toggle IN/OUT   SKIP LOG
                                 (New Shift)                (Prevent duplicate)
```

1. **Anti-Spam Guard:** The backend rejects any duplicate log submitted for the same user within **60 seconds**.
2. **Duplicate Prevention:** The frontend ignores scans occurring within **15 minutes** of a previous check-in/out.
3. **Automatic Shift Reset:** If more than **12 hours** have elapsed since the last log, the next scan is automatically recorded as an **IN** event for a new shift.

### Face Recognition Confidence Thresholds

The system evaluates Euclidean distance match scores between live faces and stored vectors:

| Distance Score | Confidence Tier | Visual Indicator | System Action |
| :--- | :--- | :--- | :--- |
| **< 0.40** | High Confidence | 🟢 Green Box | Starts 3-second countdown; logs attendance upon completion. |
| **0.40 – 0.60** | Low Confidence | 🟡 Yellow Box | Displays warning (*"Please step closer / adjust lighting"*); attendance is **blocked**. |
| **≥ 0.60** | Unknown Face | 🔴 Red Box | Displays *"Unknown Face"* message; attendance is **blocked**. |

---

## 9. Database Schema & Entity Relationship

**Canonical Database File:** `backend/facial_attendance_db.sql`  
**Database Name:** `facial_attendance_db`

```
┌──────────────────────────┐          ┌──────────────────────────┐
│          USERS           │          │     ATTENDANCE_LOGS      │
├──────────────────────────┤          ├──────────────────────────┤
│ id (PK)         INT      │1        *│ id (PK)         INT      │
│ name            VARCHAR  │─────────►│ user_id (FK)    INT      │
│ role            VARCHAR  │          │ status          ENUM     │
│ face_descriptor TEXT     │          │ timestamp       TIMESTAMP│
│ created_at      TIMESTAMP│          └──────────────────────────┘
└──────────────────────────┘

┌──────────────────────────┐          ┌──────────────────────────┐
│          ADMINS          │          │        AUDIT_LOGS        │
├──────────────────────────┤          ├──────────────────────────┤
│ id (PK)         INT      │          │ id (PK)         INT      │
│ username        VARCHAR  │          │ user_id         INT      │
│ password        VARCHAR  │          │ action          VARCHAR  │
│ created_at      TIMESTAMP│          │ entity_type     VARCHAR  │
└──────────────────────────┘          │ ip_address      VARCHAR  │
                                      │ timestamp       DATETIME │
                                      └──────────────────────────┘
```

### Table Specifications:

#### 1. `users` (Employee Profiles)
* `id`: `INT AUTO_INCREMENT PRIMARY KEY`
* `name`: `VARCHAR(100) NOT NULL` — Full employee name used in greetings and tables.
* `role`: `VARCHAR(50) NOT NULL` — Employee ID or department identifier (e.g., `ENG-2026-0008`).
* `face_descriptor`: `TEXT NOT NULL` — JSON string containing the 128-dimensional floating point numbers.
* `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

#### 2. `attendance_logs` (Timecard Records)
* `id`: `INT AUTO_INCREMENT PRIMARY KEY`
* `user_id`: `INT NOT NULL` — Foreign Key pointing to `users(id)` (`ON DELETE CASCADE`).
* `status`: `ENUM('IN', 'OUT') NOT NULL` — Attendance state.
* `timestamp`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (Indexed for fast reporting).

#### 3. `admins` (Administrative Credentials)
* `id`: `INT AUTO_INCREMENT PRIMARY KEY`
* `username`: `VARCHAR(50) UNIQUE NOT NULL`
* `password`: `VARCHAR(255) NOT NULL` — Encrypted bcrypt hash string.
* `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

#### 4. `audit_logs` (Security Logbook)
* `id`: `INT AUTO_INCREMENT PRIMARY KEY`
* `user_id`: `INT` — ID of administrator or employee who performed the operation.
* `user_type`: `ENUM('admin', 'employee')`
* `action`: `VARCHAR(50)` — Action name (e.g., `LOGIN`, `CHECK_IN`, `CREATE_EMPLOYEE`).
* `entity_type`: `VARCHAR(50)` — Affected entity (e.g., `employee`, `attendance`).
* `old_values` / `new_values`: `JSON` — State snapshot before and after change.
* `ip_address`: `VARCHAR(45)` — Client IP address.
* `timestamp`: `DATETIME DEFAULT CURRENT_TIMESTAMP` (Indexed).

---

## 10. Complete API Reference

**Base Server URL:** `http://localhost:5000/api`

### Authorization Key:
* 🔓 **Public Endpoint:** No security token required (accessible by entrance kiosk).
* 🔒 **Protected Endpoint:** Requires HTTP Header `Authorization: Bearer <JWT_TOKEN>`.

---

### Authentication — `/api/admin`

#### `POST /api/admin/login` 🔓
* **Description:** Logs in an administrator and returns a JWT access token (1-day expiration).
* **Request Payload:**
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "admin": { "id": 1, "username": "admin" }
  }
  ```

---

### Face Vectors & Users — `/api/users`

#### `GET /api/users` 🔓
* **Description:** Fetches all registered employees and their face vectors for the kiosk.

#### `POST /api/users/register` 🔓
* **Description:** Registers a new employee with their 128-dimensional face vector.
* **Request Payload:**
  ```json
  {
    "name": "JANE DOE",
    "role": "HR-2026-0005",
    "faceDescriptor": [0.124, -0.098, 0.311, ...]
  }
  ```

---

### Attendance Logging — `/api/attendance`

#### `POST /api/attendance/log` 🔓
* **Description:** Records a new attendance check-in or check-out event from the kiosk.
* **Request Payload:**
  ```json
  {
    "userId": "DANIEL RILLERA",
    "status": "IN"
  }
  ```

#### `GET /api/attendance/daily` 🔒
* **Description:** Retrieves attendance records for a given date with optional search filters.
* **Query Parameters:** `date`, `userId`, `status`, `sortBy`, `sortOrder`.

#### `GET /api/attendance/last/:userId` 🔓
* **Description:** Returns the most recent attendance record for a user to determine whether their next scan should be IN or OUT.

---

### Employee Management — `/api/employees`

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | 🔒* | List employees with search, filter, and pagination. |
| `GET` | `/api/employees/:id` | 🔒* | Retrieve detailed profile for a single employee. |
| `POST` | `/api/employees` | 🔒* | Create a new employee profile. |
| `PUT` | `/api/employees/:id` | 🔒* | Update employee details or re-capture face vector. |
| `DELETE` | `/api/employees/:id` | 🔒* | Remove an employee from the system database. |

---

### Reports & Analytics — `/api/reports` & `/api/dashboard`

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/daily` | 🔒 | Aggregated daily attendance counts and summaries. |
| `GET` | `/api/reports/weekly` | 🔒 | Aggregated weekly attendance performance statistics. |
| `GET` | `/api/reports/monthly` | 🔒 | Aggregated monthly attendance metrics for HR payroll. |
| `GET` | `/api/dashboard/stats` | 🔒 | Real-time analytics charts, hourly heatmaps, and counts. |

---

## 11. Authentication & Security Audit

### Security Controls Currently Implemented:

1. **Bcrypt Password Hashing:** Admin passwords are encrypted using `bcryptjs` with salt rounds prior to storage.
2. **JWT Authentication:** Admin portal operations require a signed JSON Web Token with 24-hour expiration.
3. **API Rate Limiting:** Global rate limiter (`express-rate-limit`) limits clients to **100 requests per 15-minute window** to prevent brute-force attacks.
4. **Parameterized SQL Queries:** Database interactions use `mysql2` prepared statements to render SQL Injection attacks impossible.
5. **CORS Isolation:** Cross-Origin Resource Sharing is restricted strictly to `FRONTEND_URL` (`http://localhost:3000`).
6. **System Audit Trail:** Crucial actions generate immutable audit log records documenting IP, user ID, and timestamp.

> [!WARNING]
> **Recommended Security Enhancements for Production:**
> * Enforce strict server-side JWT checking on all `/api/employees` endpoints.
> * Encrypt `face_descriptor` text values at rest in the database.
> * Enable HTTPS / SSL encryption for webcam streams and API endpoints.

---

## 12. Real-Time Messaging & Performance Optimizations

### ⚡ Real-Time Socket.IO Integration

The platform features built-in WebSocket support using **Socket.IO**:
* When the kiosk records attendance, `POST /api/attendance/log` broadcasts an `attendance:new` event to the `admin-room`.
* Connected Admin Dashboard screens receive the event instantly and insert the new row into the **Daily Logs** table without requiring a page refresh.

### 🚀 Redis In-Memory Caching

To guarantee instant response times during peak check-in hours (e.g., 8:00 AM office arrival):
* The backend incorporates a **Redis** caching middleware (`backend/config/redis.js`).
* Frequently queried endpoints (such as `/api/users` and `/api/dashboard/stats`) are cached in RAM with a 5-minute Time-To-Live (TTL).
* **Automatic Fallback:** If Redis is not installed on the host machine, the system gracefully falls back to an in-memory `node-cache` instance without failing.

---

## 13. Setup & Installation Guide

### Prerequisites
* **Node.js:** v14.x or higher
* **Database:** MySQL 5.7+ or MariaDB (e.g., WAMP, XAMPP, or standalone MySQL)
* **Web Browser:** Google Chrome or Microsoft Edge (WebRTC camera support required)

---

### Step-by-Step Installation:

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd face_recog
```

#### 2. Database Initialization
Import the database schema and initial seed data into MySQL using phpMyAdmin or terminal:
```bash
mysql -u root -p < backend/facial_attendance_db.sql
```

#### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env` to configure your MySQL connection details:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=facial_attendance_db
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key
```
Start the backend development server:
```bash
npm run dev
```
*Server will start at **http://localhost:5000***.

#### 4. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Application will start at **http://localhost:3000***.

---

## 14. System Configuration & Port Mapping

### Port Assignment Matrix:

| Component | Default Port | Environment Key | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` | `PORT` | Express REST API & Socket.IO server |
| **Frontend Web App** | `3000` | — | Vite React Dev Server |
| **MySQL Database** | `3306` | `DB_HOST` | Database server connection |
| **Redis Cache** | `6379` | `REDIS_PORT` | Optional in-memory cache server |

---

## 15. Automated Testing Suite & Standards

The project features comprehensive end-to-end (E2E) and integration tests powered by **Playwright**.

### Test Execution Commands:

```bash
# Run all automated tests (API & E2E)
npm run test:all

# Run backend API integration tests
npm run test:api

# Run browser E2E tests
npm run test:e2e

# Run tests in visible browser window (headed mode)
npm run test:headed

# Open interactive Playwright UI dashboard
npm run test:ui
```

### Stable Test Selectors (`data-testid` Standards)

UI elements include explicit `data-testid` attributes to ensure tests remain reliable even when styling changes:

```html
<!-- Input Fields -->
<input data-testid="username-input" />
<input data-testid="employee-name-input" />

<!-- Buttons -->
<button data-testid="login-submit-button">Login</button>
<button data-testid="start-camera-button">Start Camera</button>
<button data-testid="capture-face-button">Capture Face</button>

<!-- Navigation & Tables -->
<button data-testid="nav-daily-logs">Daily Logs</button>
<table data-testid="employee-table"></table>
```

---

## 16. Known Limitations & Troubleshooting

1. **Browser Camera Permissions:** Browsers restrict camera access to `localhost` or secure `https://` URLs. Ensure camera access is allowed in browser settings.
2. **First-Load AI Model Download:** On the first kiosk load, the browser downloads facial recognition model files from a CDN. Ensure internet connectivity during initial startup (or store model weights locally in `frontend/public/models/`).
3. **Database Name Matching:** Verify that `DB_NAME` in `backend/.env` matches `facial_attendance_db` created by the SQL dump.

---

## 17. Multi-Phase Project Roadmap

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PHASE 1    │───►│   PHASE 2    │───►│   PHASE 3    │───►│   PHASE 4    │───►│   PHASE 5    │
│ (COMPLETED)  │    │  (SECURITY)  │    │ (PERFORMANCE)│    │   (MOBILE)   │    │   (DEVOPS)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

* **Phase 1 (Current Core Baseline):** Attendance kiosk, admin management dashboard, face registration, database logging, PDF/Excel reports, Socket.IO real-time sync, Redis caching layer.
* **Phase 2 (Enhanced Security):** Two-Factor Authentication (2FA/TOTP) for admins, strict server-side route guards, encrypted vector storage.
* **Phase 3 (Enterprise Performance):** Multi-location kiosk synchronization, database partitioning for large enterprises.
* **Phase 4 (Mobile & Offline PWA):** Progressive Web App (PWA) support allowing kiosks to buffer attendance logs offline when internet connectivity drops.
* **Phase 5 (DevOps & Infrastructure):** Docker containerization, automated CI/CD deployment pipelines, automated daily database backup routines.

---

## 18. Related Project Documentation

For specialized technical topics, refer to the individual markdown guides in the repository:

* 📘 [README.md](README.md) — Quickstart summary and `data-testid` testing standards.
* 🛠️ [SETUP_GUIDE.md](SETUP_GUIDE.md) — Step-by-step developer setup and configuration guide.
* 📷 [CAMERA_BEHAVIOR.md](CAMERA_BEHAVIOR.md) — Camera idle timeout, motion detection algorithms, and dwell verification specs.
* 🧠 [FACIAL_RECOGNITION_LIBRARIES.md](FACIAL_RECOGNITION_LIBRARIES.md) — Comparative analysis of face-api.js AI model weights and distance metrics.
* 🔒 [SECURITY.md](SECURITY.md) — In-depth security analysis and vulnerability remediation checklist.
* ⚡ [PERFORMANCE.md](PERFORMANCE.md) — Database indexing strategy, Redis caching, and rendering benchmarks.
* 🧪 [PLAYWRIGHT_TEST_PLAN.md](PLAYWRIGHT_TEST_PLAN.md) — Comprehensive test coverage plan and suite architecture.
* 📋 [PLAYWRIGHT_TESTING_SUMMARY.md](PLAYWRIGHT_TESTING_SUMMARY.md) — Execution summary and test verification results.
* 🗺️ [PHASE2_TO_PHASE5_PLAN.md](PHASE2_TO_PHASE5_PLAN.md) — Full multi-phase architectural roadmap.

---

*End of Documentation.*
