# Worklog — 2026-09-29 (Asia/Manila)

## Scope and status

Reviewed the JAJR facial-recognition attendance repository, the supplied Ubuntu production-session output, deployment documentation, a newer local SQL dump, and available local checks. **Production is serving requests, but the current code is not ready for a wider production rollout involving attendance and biometric data.** This was a review and documentation session: no application code was fixed, no SQL was imported, and no server deployment was performed from this workspace.

## Work completed today

1. Replaced the older JAJR server guide with an updated [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md). It now describes the observed Ubuntu 24.04 / Docker Compose / host Nginx / Certbot setup, backup and update steps, non-destructive error checks, and the risks in the newer SQL dump.
2. Reviewed the server transcript. Host Nginx passed `nginx -t` and reloaded; the public homepage returned HTTPS `200`. `GET /api/admin/login` returned the expected `404` because the route is POST-only, and an empty login POST returned validation `400`.
3. Reviewed later application logs supplied by the operator. Two login attempts returned `401`, then a login returned `200`. Database-backed dashboard, employee, attendance, audit, chat-room, and report requests returned `200` or cache-validating `304`. Socket.IO upgrades returned `101`, and the backend logged authenticated admin-room joins. The shown backend/database logs contained no application error. This establishes those flows only for the observed window; it does not verify camera operation, chat-file delivery, or every database path.
4. Inspected `facial_attendance_db (1).sql` (local, untracked; generated September 29). It is a full phpMyAdmin dump with `DROP TABLE` for 12 tables, including admins, users, attendance, and audit logs. It has 462 attendance rows and 618 audit rows versus 166 and 308 in the older bundled dump. It lacks a `FOREIGN_KEY_CHECKS` wrapper. Production activity occurred after the dump time, so importing it as-is risks losing newer records. **No import was run.** The intended merge-versus-replace behavior remains unresolved.
5. Tried a read-only, noninteractive SSH check of the production server. Authentication was rejected (`Permission denied (publickey,password)`), so live database state and server configuration could not be independently inspected from this workspace. No SSH password was requested or stored.
6. Reviewed the web frontend, Express backend, MySQL schema and migration path, Redis/Compose setup, Expo mobile app, tests, and documentation. The separate `react-native-movie-app/` is an unrelated sample project and is not part of the Compose deployment.

## Project review findings

### Release blockers

| Area | Finding and evidence | Required work |
| --- | --- | --- |
| Chat authentication | [chatRoutes.js](backend/routes/chatRoutes.js) assigns Superadmin identity when a token is absent or invalid. All chat routes use that middleware. | Reject missing/invalid tokens; test every chat endpoint without a token. |
| Chat authorization | [server.js](backend/server.js) lets sockets join a chat room by supplied ID without checking identity or membership. [chatController.js](backend/controllers/chatController.js) reads room messages by ID without a membership check and lists rooms broadly. | Authenticate socket connections, enforce room membership on reads/writes/joins, and limit broadcasts to authorized members. |
| Kiosk attendance trust | The kiosk key is hardcoded in [faceApiLoader.js](frontend/src/utils/faceApiLoader.js) and [AttendanceCard.jsx](frontend/src/components/AttendanceCard.jsx); [kioskAuth.js](backend/middleware/kioskAuth.js) accepts that key for protected operations. The mobile app uses an `EXPO_PUBLIC_` key, which is visible in client bundles. Face matching happens on the client. | Redesign kiosk/device authentication and server-side attendance validation; remove client-embedded shared secrets and rotate exposed keys. |
| Biometric data | [userController.js](backend/controllers/userController.js) returns decrypted descriptors for all users. [crypto.js](backend/utils/crypto.js) has a fixed fallback encryption key. Historical SQL dumps and an uploaded attachment are tracked in Git. | Restrict descriptor distribution, require a managed encryption key, review repository/data exposure, and plan key migration before rotation. |
| Offline sync | [syncController.js](backend/controllers/syncController.js) inserts `method` and `location` into `attendance_logs`, but neither the bundled nor newer SQL schema has those columns. It can also report per-record failures with HTTP `200`, while [syncService.js](mobile/src/services/syncService.js) marks the whole batch synced on `200`. | Align schema and insert, return/consume per-record results, and test retries and duplicate handling. |

### Deployment and quality gaps

| Area | Finding and evidence | Required work |
| --- | --- | --- |
| Compose secrets and exposure | [docker-compose.yml](docker-compose.yml) has mismatched fallback DB passwords, development JWT/kiosk defaults, ports 7000/7001 published on all interfaces, and no health checks. `depends_on` does not establish DB readiness. | Fail startup when secrets are missing; verify existing DB credentials, restrict host ports after checking direct clients, and add readiness checks. |
| Images and stored files | [backend/Dockerfile](backend/Dockerfile) uses `COPY . .` with no backend `.dockerignore`, so a local `backend/.env`, backups, and uploads can enter the image. Backend uploads/backups lack persistent mounts. [frontend/nginx.conf](frontend/nginx.conf) does not proxy `/uploads/`. | Exclude sensitive build-context files, persist uploads, back them up, and add a controlled upload route with file-type checks. |
| Runtime | Both Dockerfiles use `node:20-alpine`. Node 20 reached end of life in March 2026 ([Node.js release status](https://nodejs.org/en/about/eol)). | Move to a supported LTS release and test both images. |
| Mobile | [mobile/src/api/client.js](mobile/src/api/client.js) targets a private HTTP development IP. `mobile/` has Expo Router imports but no `expo-router` dependency; mobile lint fails. | Configure a production HTTPS API URL, resolve navigation dependencies, and validate an actual device build and sync. |
| Tests | Frontend has four passing unit tests. Root Playwright configuration targets local ports 3000/5000 with no enabled web-server launcher; its fixture contains a known example admin password. Backend has no test script. | Add isolated API/security tests for unauthenticated chat, room membership, kiosk actions, attendance, and sync; make E2E setup reproducible. |
| Documentation | [docs/SECURITY.md](docs/SECURITY.md) marks authentication, biometric protection, and rate limiting as fully secured despite the code findings; [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) names `facial_attendance_db` while Compose uses `jajr_attendance`. `SYSTEM_DEPLOYMENT_MANUAL.md` describes another application, and `docs/DEPLOYMENT_PLAN.md` describes an older PM2 setup. | Reconcile claims and designate one current deployment guide. |

The browser/API logs demonstrate that the current public site is usable for some flows. They do **not** resolve the release blockers above. No direct penetration test or full live-server audit was performed.

## Checks run today

| Check | Result |
| --- | --- |
| `frontend: npm run lint` | Passed. |
| `frontend: npm test -- --run` | Passed: 1 file, 4 tests. Initial sandbox run hit `spawn EPERM`; the authorized run outside the sandbox passed. |
| `frontend: npm run build` | Passed. Initial sandbox run hit `spawn EPERM`; the authorized run outside the sandbox passed. Vite warned that one minified chunk exceeds 1 MB. |
| `npm audit --omit=dev --audit-level=high` | Reported zero known advisories in the root, backend, frontend, and mobile package sets at check time. This does not establish code security. |
| `mobile: npm run lint` | Failed: 3 unresolved Expo Router imports and 8 warnings. |
| Root Playwright API/E2E suite | Not run: configured for local services that were not started for this review. Earlier documentation's historical pass claims were not reverified. |
| Live production database / server | Not independently checked: SSH authentication unavailable. Only operator-supplied logs and commands were reviewed. |

## Current workspace and open decisions

- `SERVER_DEPLOYMENT.md` is modified and not committed. `facial_attendance_db (1).sql` is untracked and contains sensitive production-like data; do not stage it accidentally.
- A detailed `DEPLOYMENT-MANUAL.md` was drafted earlier in this conversation, but that file is **not present in the current checkout**. The persistent guide here is `SERVER_DEPLOYMENT.md`.
- No production SQL import occurred. Before any import, decide whether to preserve existing production records and merge selected rows, or replace tables after a verified backup and maintenance plan. The dump must not be piped directly into the live database.
- No application fix, Git commit/push, server deployment, credential rotation, or production restore was performed today.

## Next actions, in order

1. Close the unauthenticated chat and room-membership paths, then add negative authorization tests.
2. Redesign kiosk authentication and attendance trust; restrict biometric descriptor delivery and address exposed keys/data.
3. Repair offline sync schema and partial-batch acknowledgment, with data-loss regression tests.
4. Harden Compose secrets, network binding, image build context, health checks, upload persistence, and Node runtime.
5. Fix the mobile production URL and lint errors; run API, E2E, and device smoke tests in an isolated staging environment.
6. Reconcile documentation with the implemented controls. Only then plan a production rollout or any reviewed database migration.

## Update - 2026-09-30 (Asia/Manila)

This section supersedes the earlier statement that no application fixes had been made. The workspace now contains the browser, backend, mobile, deployment, and documentation updates described below. No production deployment or production SQL import was performed.

### Completed

- Added `Documentation.md`, `issue.md`, `proposal.md`, and `plan.md` covering the project, low-resolution scanning, low-spec mobile performance, and production investigation.
- Moved browser kiosk face detection and matching to the backend. The shared kiosk starts its camera and scans automatically without administrator sign-in or scan buttons. It reports the negotiated camera resolution, sends compressed JPEG frames, pauses when hidden or offline, and resumes after connectivity returns.
- Added server-side face validation and matching, limited image size, protected the scanner/admin token boundary, and returned a normal nonmatch response for the public kiosk. The browser shows a prominent attendance confirmation for one second and the server enforces a two-minute same-person kiosk cooldown.
- Added attendance coordinate columns to the startup migration for older local databases. Seeded and verified the local administrator account; local database contents and credentials are not part of this Git update.
- Changed the Expo scanner to send captured images to the server for identification and attendance, with location support when geofencing is enabled. Updated the mobile API target and Android export dependencies.
- Updated Docker, Compose, Nginx, and deployment guidance for the server inference path and production routing. Added limited chat token checks; room membership authorization still needs a separate review.
- Updated backend and frontend tests to reflect the automatic scanner and two-minute cooldown.

### Verification

| Check | Result |
| --- | --- |
| Backend `npm test` | Passed: 7 tests. |
| Frontend `npm test` | Passed: 5 tests across 2 files. |
| Frontend `npm run lint` | Passed. |
| Frontend `npm run build` | Passed; Vite still warns about the large admin chunk. |
| Mobile `npx expo export --platform android` | Passed. |
| Mobile `npm run lint` | Fails on 3 unresolved `expo-router` imports in unused scaffold components. |
| Local frontend proxy and backend settings endpoints | Both returned HTTP 200 during the connectivity investigation. |

### Remaining validation

- Measure recognition accuracy, camera resolution, startup time, and scan latency on the affected low-spec phones. No physical device benchmark or production scan was completed.
- Resolve the mobile scaffold lint errors and run end-to-end and security checks before a production rollout. Review chat room membership enforcement separately.
- Keep `facial_attendance_db (1).sql` out of Git: it is an untracked full database dump containing attendance and audit data. No database dump is included in this update.

### Deployment manual correction

- Replaced the copied ENG PLANNER `SYSTEM_DEPLOYMENT_MANUAL.md` with a JAJR quick reference. The observed production checkout remains `/root/jajr_facial_recognition`; an installation intentionally placed under `/var/www` uses `/var/www/jajr_facial_recognition`.
- Updated `SERVER_DEPLOYMENT.md` to point to the corrected quick reference and reflect the current Compose environment and root `.dockerignore`. No server files were changed by this documentation correction.

### Production log diagnosis, 2026-09-30

- Operator-provided Compose logs show `Access denied for user 'jajr_admin'` during startup migration and repeated `GET /api/attendance/settings` 500 responses. The settings handler reads MySQL, so the database login failure is the immediate cause of scanner startup failure. A Compose environment change does not rotate the password stored in the existing MySQL volume.
- Set Express to trust private Docker proxy addresses for client IP handling, removed obsolete Compose `version`, and added server-side logging when public attendance settings cannot be read. These changes address separate warnings; they do not repair the production MySQL account.
- Added a credential verification and recovery procedure to `SERVER_DEPLOYMENT.md` that preserves `db_data`. No remote password, account, or data was changed from this workspace.
- Backend `npm test` passed (7 tests) and `node --check server.js` passed. Local `docker compose config --quiet` could not run because Docker is unavailable in this Windows workspace. Production credential reconciliation and a live endpoint check remain pending on the server.

### Branch change

- Promoted the existing `main` branch to the current development branch and GitHub default, retaining all commits from `master`. The local branch tracks `origin/main`. Updated deployment commands to use `main` and documented the one-time switch for the production checkout still on `master`.
- The legacy remote `master` branch is retained while production is being switched. Branch changes do not resolve the production MySQL credential failure described above.
