# JAJR facial attendance: project documentation

Updated 2026-09-30 for the implementation in this working tree. [issue.md](issue.md) and [proposal.md](proposal.md) record the original investigation and proposed fixes; some descriptions there refer to the old code. [plan.md](plan.md) defines the validation gates. No production deployment or physical-phone validation has been performed for these changes.

## Repository map

| Path | Purpose |
| --- | --- |
| `frontend/` | React, Vite, Tailwind browser scanner, admin portal, and PWA |
| `backend/` | Express API, face inference, MySQL, Redis cache, Socket.IO |
| `mobile/` | Expo Android/iOS scanner client |
| `tests/` | Existing Playwright browser and API tests |
| `docker-compose.yml` | Production containers: frontend, backend, MySQL, Redis |
| `SERVER_DEPLOYMENT.md` | Existing server deployment notes |

## Scan and attendance flow

```text
Browser kiosk: automatic camera -> motion/periodic frame -> HTTPS /api/face/kiosk-attendance
Expo: administrator login -> scanner session -> still photo -> HTTPS /api/face/attendance
Server: one-face detection -> descriptor -> enrolled-user comparison
Server: choose employee ID -> choose IN/OUT -> geofence and duplicate checks
MySQL attendance row -> response -> browser/Expo confirmation
```

The shared browser scanner is at `/` and needs no administrator sign-in or scan button. Once the attendance server responds, it requests camera permission and begins scanning automatically. It samples a tiny frame locally to detect scene changes, sends a compressed JPEG at up to 1280 pixels on the long side when motion occurs, and also sends periodic frames so a still face is not missed. Only one scan request runs at a time. The camera pauses when the page is hidden and restarts when visible. Successful attendance keeps the camera open for the next person. Recent matched IDs are suppressed until the camera reports no face twice; the person should step out of frame before scanning again. The server also suppresses a second kiosk toggle for the same person for 2 minutes by default (`KIOSK_TOGGLE_COOLDOWN_MINUTES`), so a brief detection gap cannot immediately turn an IN into OUT. A low-spec phone no longer downloads the recognition models or all employee descriptors to scan. The browser still loads face-api.js models in the admin enrollment screen.

The Expo client signs in with a real admin account, exchanges that token for a scanner JWT, captures a front-camera photo, resizes and compresses it, and uploads it over HTTPS. It requests foreground location when geofencing is enabled. It does not create offline attendance or claim a match locally. The old SQLite and sync modules remain in the repository but are outside the current scan path. `EXPO_PUBLIC_API_URL` sets the API base; absent that value, the app uses `https://jajr.xandree.com/api`. Development on a physical phone needs a reachable local HTTPS/API address rather than `localhost` on the phone.

The server loads Tiny Face Detector, 68-point landmarks, and face recognition models from `FACE_MODEL_DIR` (Docker: `/app/models`, local default: `frontend/public/models`). It rejects JPEGs above 1.5 MB, frames below 240 pixels on either side, frames over five megapixels, no face, more than one face, and detected faces under 80 pixels wide. It compares the resulting 128-value descriptor to enrolled employee descriptors with a 0.4 distance cutoff and a 0.05 separation from the next best identity. The image is processed in memory and is not written by this endpoint. `Server-Timing` reports server face inference duration. Recognition thresholds are conservative starting values, not validated accuracy guarantees.

For the automatic browser kiosk, ordinary no-face and unknown-face outcomes return `200` with `matched: false`, a `reason`, and a guidance message. They never create attendance. The Expo scanner route retains `422` for those outcomes. A repeated `422` in an older kiosk build can therefore be investigated by checking the response `reason`; do not relax the matching cutoff based only on the status code.

An accepted match supplies the employee ID on the server. The last attendance row determines IN or OUT, with a 12-hour new-shift rule. The public kiosk enforces a default 2-minute minimum before toggling the same person again; the Expo scanner retains a one-minute minimum. The existing attendance controller applies same-status duplicate suppression, optional geofencing, audit logging, and Socket.IO notification. The response supplies the employee ID, name, status, and log ID. Scanner tokens cannot call general admin or manual attendance routes.

## Enrollment and data

In the admin Employee Directory, capture three guided samples for a new employee with exactly one detected face at least 80 pixels wide. Descriptors are stored as an array of three 128-value arrays, encrypted by the backend. Legacy one-descriptor enrollments remain readable, but re-enrollment is recommended for the pilot. The same face-api.js model family is used for enrollment and server recognition; changing model families requires re-enrollment. Avoid storing raw face photos in logs or diagnostic reports.

MySQL holds `users`, `admins`, `attendance_logs`, `audit_logs`, `system_settings`, and chat/notification tables. Redis is optional cache infrastructure. The scanner reads current encrypted enrollments from MySQL for each match, so adding or changing an employee does not require a browser cache refresh. Browser admin routes fetch descriptors only with an admin JWT. Production disables the legacy kiosk API key; manual attendance remains an admin-only route.

The backend's startup migration adds nullable `latitude` and `longitude` columns to older `attendance_logs` tables when missing. Attendance inserts include both columns even when geofencing is disabled. A local database with the older four-column table produced 500 responses after successful face matching until this migration was applied.

## Main API routes

| Route | Access | Purpose |
| --- | --- | --- |
| `POST /api/admin/login` | Public credentials | Obtain admin JWT |
| `POST /api/face/session` | Admin JWT | Obtain scanner JWT |
| `POST /api/face/kiosk-attendance` | Approved browser origin; no login | Upload JPEG, identify, log attendance |
| `POST /api/face/attendance` | Scanner JWT | Expo upload, identify, log attendance |
| `GET /api/attendance/settings` | Public | Read geofence enabled flag |
| `/api/employees`, `/api/users` | Admin JWT | Enrollment and admin views |
| `/api/attendance/daily`, `/all` | Admin JWT | Attendance reports |
| `POST /api/attendance/log`, `/batch-sync` | Admin JWT in production | Manual/legacy attendance paths |

Other admin routes cover reports, dashboard, audit, settings, chat, and assistant functions. `backend/server.js` mounts the route groups and configures CORS and Socket.IO. A public web client must never rely on the old kiosk key as proof of a scan.

## Admin portal and supporting services

`/admin/dashboard` contains employee registration and re-enrollment, daily attendance, attendance audit, reports and exports, charts, system settings, administrator management, and a chat/assistant widget. `AdminLayout.jsx` assembles these views. The route guard checks that a token exists; backend middleware verifies JWT signatures and the `admin` type for protected API calls. Admin management additionally checks the administrator's position in its controller. A stored but expired token can reach the dashboard shell, then protected requests fail until the operator signs in again.

`backend/controllers/employeeController.js` handles employee records and encrypted face descriptors. `attendanceController.js` handles writes, geofencing, reports, and Socket.IO attendance events. `reportController.js`, `dashboardController.js`, and `auditController.js` serve reporting and audit views. `chatController.js` handles rooms, messages, and attachments; chat HTTP and Socket.IO events require admin credentials. `assistantRoutes.js` exposes the assistant API. `backend/middleware/` contains token checks, validation, rate limiting, cache, and audit helpers. Uploaded attachments and backup files need access controls and retention policies separate from scanner photos.

Admin enrollment runs face-api.js in the browser. Its model binaries are available under `/models/`; this cost is confined to the enrollment screen, while the ordinary scanner uses the server. The current admin settings UI stores camera and match configuration, but the server scan cutoff and capture size are fixed in code. Changing settings in the admin UI does not tune these values until they are explicitly wired and validated.

## Local development

1. Install dependencies in `backend/`, `frontend/`, and `mobile/` with `npm ci`.
2. Configure backend `.env` for `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`. This workspace uses backend `PORT=7000`; Vite proxies `/api` there by default. Set `VITE_API_PROXY_TARGET` before starting Vite if your backend uses another port.
3. Start backend with `npm run dev` in `backend/`, then frontend with `npm run dev` in `frontend/` (port 3000). Run MySQL and optional Redis. Camera access on a phone requires a secure context.
4. For Expo, set `EXPO_PUBLIC_API_URL` to a reachable HTTPS endpoint if the production default is inappropriate, then run the Expo development workflow. An administrator must log in before scans.

`npm test` in `backend/` checks token separation, unauthenticated kiosk access with origin checks, legacy kiosk key rejection, and a real no-face JPEG inference. `npm test` in `frontend/` verifies that the kiosk opens the camera and submits a frame without button presses. `npm run build` in `frontend/` creates the browser/PWA bundle. `npx expo export --platform android` checks Android bundling. Root Playwright tests are older and may need fixture updates for the server scan path.

Root `tests/api/` and `tests/e2e/` contain Playwright coverage for authentication, employees, attendance, camera UI, integration, and admin views. The root `package.json` defines test scripts; `playwright.config.js` expects a running frontend service. These older tests were not used as evidence of biometric accuracy and some assert the superseded browser scan flow.

## Production deployment

The Compose backend build context is the repository root so Docker can copy both backend code and `frontend/public/models`; the backend Dockerfile runs `npm ci --omit=dev`. Compose defaults `FRONTEND_URL` to `https://jajr.xandree.com`. Set real `JWT_SECRET`, database credentials, and other production environment values in deployment secrets. Existing MySQL volume users are not changed automatically when Compose environment values change. Build and recreate frontend and backend together, then verify backend model preload logs and the new `/api/face/session` route. Deploying only the frontend would leave scanning unusable.

The frontend serves hashed assets with long-lived immutable caching and model files with a bounded cache lifetime. The PWA precaches core assets and caches local face models when the admin enrollment screen uses them. Clear or update an installed PWA during the pilot to ensure its old code is replaced. The Expo app requires a new build/install for its changed native camera/location configuration.

## Known limits and release checks

- No physical low-resolution phone, low-spec phone, or production scan was available during implementation. Measure cold/warm start, JPEG size and upload time, server `Server-Timing`, total scan latency, actual camera resolution, no-face/unknown/known results, and wrong-person logs on the affected devices.
- Server inference is serialized per backend process. Automatic scanning sends frames on movement and periodically while the page is visible; concurrent kiosks can receive `503 Scanner is busy`. Measure expected peak traffic and server CPU before rollout. Horizontal scaling needs a shared concurrency strategy.
- The browser backs off after server errors, up to a 30-second retry interval, to avoid repeatedly posting frames while attendance storage is unavailable.
- A face photo is not liveness proof. The system can be fooled by a presented photo; assess this before using it for payroll or other high-stakes decisions.
- Three-sample enrollment and the 0.4 threshold need a consented accuracy pilot. Any wrong-person attendance record stops rollout. Unknown or uncertain faces should retry or use a supervised fallback.
- The shared browser kiosk requires no login. Its origin check prevents ordinary cross-site browser requests but is not device authentication; a scripted client can spoof the Origin header. Rate limiting, server-side face matching, and duplicate suppression reduce some abuse, but a replayed face photo or unauthorised use of the public scanner remains possible. Restrict kiosk access at the network/reverse proxy if this is unacceptable for payroll use.
- The Expo app still requires administrator sign-in. If it will run on employees' personal phones, it needs a separate employee account and authorization design before rollout.
- Geolocation values come from the client. Geofencing checks validity and distance, but a modified client could forge coordinates.
- No Docker engine or production SSH access was available locally, so the container build, production MySQL compatibility, PWA update, and real network timing still need deployment-stage verification.
