# Worklog — 2026-09-29 (Asia/Manila)

## Current status — 2026-10-08 (Asia/Manila)

This worklog is chronological. Earlier statements such as “not deployed” describe the state at that time; the latest status is below.

| Task | Latest status |
| --- | --- |
| Server and kiosk investigation | Documented the initial production/API failures, server-side face matching path, geofencing behavior, scan cooldown, and deployment procedure in the dated sections below. No production SQL dump was imported. |
| Production MySQL recovery | Existing data was backed up before account reconciliation; the database authentication failure was resolved and `/api/attendance/settings` returned HTTP 200. |
| Admin dashboard review and fixes | Reviewed all eight signed-in sections, wrote the review and implementation plan, fixed the listed reporting, audit, deletion-guard, settings, health, cache, and CSV issues, and deployed the backend/frontend update. A fresh verified logical backup preceded that deployment. |
| Localhost setup | Replaced ignored `backend/.env` with tested WAMP localhost values and unique local secrets, added Vite Socket.IO proxying, and updated the setup guide. MySQL, local frontend/API, Socket.IO, and lint checks passed. |
| Production secrets | The operator added generated `JWT_SECRET` and `KIOSK_API_KEY` values and recreated the backend; masked checks showed both loaded. Existing admin sessions need a fresh sign-in. |
| Scanner timer | Commit `04667bb` was deployed before the multi-site update. An actual on-device timed scan has not yet been observed. |
| Multi-site geofencing | Commit `d6c9a36` is deployed on the production VPS. A verified backup preceded the migration; the three sites and nine initial Main Office assignments were confirmed. A Main Office scan matched the employee but was rejected by the location boundary; diagnostic update `8826d71` is deployed to measure the phone's reported distance and accuracy. |
| Mirrored web camera | Commit `58ebc5a` is deployed on the production VPS. The kiosk and enrollment previews are mirrored for display; recognition frames remain unflipped. Only the frontend container was rebuilt. Public homepage, API, and new assets returned HTTP 200. Live visual camera verification is still pending. |
| Manual Attendance and open-shift site transfer | Commit `bac200d` is deployed. The production transfer table and Manual Attendance `admin_username` column were verified after startup. A live authenticated transfer and scanner time-out at the destination are still pending. |
| Employee archival | Deployed with commit `1205c74`. Production has the `users.is_active` and `users.archived_at` columns. A live archive/restore action remains unverified. |
| Portrait guide and site rejection messages | Deployed with commit `1205c74`; the public kiosk asset contains the new time-out boundary context. Physical-device visual placement and attendance behavior remain unverified. The SUNDARA incident remains open pending production evidence. |

Open work remains in the admin implementation plan: timestamp/timezone reconciliation, production validation of employee archival, server-side attendance audit pagination/export, staging mutation and role tests, and device-based scan latency measurement. User screenshot files were not committed.

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

## Daily report - 2026-09-30 (clock out, Asia/Manila)

### Completed

- Expanded `SYSTEM_DEPLOYMENT_MANUAL.md` into a local push-to-production guide covering the one-time `master` to `main` switch, database backup, separate backend/frontend image builds, container startup, endpoint checks, and error logs. Added credential diagnostics for the attendance-settings failure.
- Confirmed GitHub `main` contains commit `d4d9f2d`. The operator fetched it on the VPS and switched the outer `/root/jajr_facial_recognition` checkout to `main`; `git log -1` showed `d4d9f2d` and `git status` showed `main...origin/main`. The older `master` branch retained its two local commits. The nested `jajr_facial_recognition/` directory remained untracked and was not removed.
- Reviewed operator screenshots and VPS logs. Both application images built and all four containers initially ran. The backend repeatedly reported MySQL `ER_ACCESS_DENIED_ERROR` for `jajr_admin`, explaining `/api/attendance/settings` HTTP 500. A later HTTP 502 occurred while the recreated backend was starting; frontend Nginx logged an upstream connection refusal at that moment.
- Verified that the configured application and root MySQL passwords were rejected. An interactive test of the operator's proposed application password was also rejected. The VPS had no `.env` file; recreating the backend therefore did not repair the existing MySQL credentials.
- Identified the production MySQL data volume as `jajr_facial_recognition_db_data` at `/var/lib/docker/volumes/jajr_facial_recognition_db_data/_data`. The operator measured it at 203 MB and reported 70 GB free on `/`. Provided a stopped-volume backup procedure before credential recovery.

### State at clock out

- **Production recovery is incomplete.** In the last operator output, `jajr_db` had stopped cleanly and `jajr_backend` was stopped; `jajr_frontend` and `jajr_redis` remained running. No later restart or successful endpoint check was reported.
- The cold backup commands (`tar`, `gzip -t`, `test -s`) were provided but **no backup result was reported**. Do not assume a usable backup exists.
- No MySQL password reset, `.env` creation, SQL import, database-volume deletion, or production data change was reported. No physical low-spec device benchmark was completed.
- Direct SSH from this workspace was denied, so server observations and actions above are based on operator-supplied command output. The latest documentation commit also deleted the older `SERVER_DEPLOYMENT.md` and included four screenshots; the current manual is standalone.

### Next actions

1. If leaving the recovery for later, restore the stopped services with `cd /root/jajr_facial_recognition && docker compose up -d db backend`. This restores service availability only; the settings API will still fail until MySQL authentication is repaired.
2. During a maintenance window, stop backend and MySQL, make and verify a cold backup of the 203 MB data volume, then reset the existing MySQL accounts without removing the volume.
3. Create a private, mode-600 root `.env` with distinct database root and application credentials plus JWT, kiosk, and frontend settings. Match the MySQL application account to `DB_PASSWORD`; recreate backend and verify both a direct database login and `GET /api/attendance/settings` returning HTTP 200.
4. Inspect the untracked nested checkout before cleanup, confirm actual kiosk attendance on production, and measure camera resolution and scan latency on the affected low-spec mobile devices.

## Admin dashboard implementation - 2026-10-01 (Asia/Manila)

The production authentication incident described in the September 30 entry was resolved earlier on October 1: a stopped-volume backup preceded MySQL account reconciliation, the private server `.env` was updated, services restarted, and `/api/attendance/settings` returned HTTP 200. The temporary SSH access used for that recovery was removed. No credentials are recorded here.

### Completed locally

- Reviewed all eight signed-in admin sections in connected Chrome. Employee search, Attendance Audit Today, Daily Logs IN filter, Audit Logs pagination, and report tabs responded. The live daily report showed 0 Days Present despite 2 IN events; the monthly report showed 1 day. The 14-day trend omitted inactive dates. No production record or setting was changed.
- Added `docs/ADMIN_DASHBOARD_REVIEW_2026-10-01.md` and `docs/ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md` with findings, acceptance criteria, and remaining verification.
- Corrected daily Days Present, the inclusive seven-day weekly default, and monthly report boundaries including leap February. Changed dashboard trends to include zero-activity dates, and both the breakdown and employee comparison to use each employee's latest status today. A live attendance event now refetches the complete dashboard summary.
- Made Audit Logs' end date inclusive through an exclusive next-day SQL bound. Replaced a throttle that could drop the last rapid filter change with a latest-request debounce.
- Prevented employee deletion when attendance history exists, avoiding the schema's `ON DELETE CASCADE` loss of those records. The UI now explains the restriction. Employee archival remains to be designed.
- Restricted Settings updates to known keys and validated numeric/geofence values. Attendance logging now rejects invalid enabled geofence configuration. Added authenticated `GET /api/admin/health` for measured database, Redis/local-cache, and Socket.IO server status. Replaced static Maintenance claims, removed its misplaced Save Shift Rules button, scoped Redis cache keys/purge to `jajr:cache:*`, and report cache purge errors. Labeled inactive recognition and shift controls as stored preferences.
- Added CSV escaping and spreadsheet-formula protection to Daily Logs and Audit Logs. Audit Logs now labels its export as current-page only.

### Verification

| Check | Result |
| --- | --- |
| Frontend lint | Passed. |
| Backend tests | Passed: 12 tests, including new dashboard, monthly boundary, and Settings validation checks. Local startup migration still warns because the local database credentials are unavailable. |
| Frontend tests | Passed: 7 tests, including CSV escaping checks. |
| Frontend production build | Passed; existing approximately 1.3 MB admin chunk warning remains. |
| `git diff --check` and backend `node --check` | Passed; Git reported only Windows line-ending conversion notices. |
| Production deployment | Not performed. The connected Chrome page still runs the older deployed build. |

### Remaining work before release

1. Verify whether stored MySQL attendance and audit timestamps are UTC throughout the existing data. Then apply the documented Asia/Manila business-day boundaries consistently across APIs, filters, charts, and exports; test events around midnight.
2. Build a non-destructive employee archive/deactivate flow with schema and scanner changes. The current delete guard protects history but does not provide an archive action.
3. Move Attendance Audit filtering, totals, pagination, and full export to the server; the deployed and local page still read only the newest 1,000 rows. Decide whether Audit Logs needs full filtered export or an explicit current-page contract.
4. Test backup download/restore, cache outage behavior, role restrictions, settings effects, reports, and exports with staging data. Reconcile production counts using read-only SQL after the timestamp convention is established.
5. Prepare a database backup and reviewed rollout. Rebuild and deploy backend/frontend, then verify the new health endpoint, reports, filters, console, and asset hashes. No Git commit, push, or production deployment was made in this update.

### October 1 release attempt

- Committed the admin dashboard fixes, tests, review, and implementation plan as `f0d757a` (`Improve admin dashboard reporting and settings`) and pushed it to GitHub `main`. Screenshot additions and deletions were excluded from the commit.
- The Windows workstation could not establish SSH to `72.62.254.60:22` (`Connection timed out`). No fresh database backup, server fetch, image build, container restart, or production verification was performed. Production remains on its prior deployed build until the VPS checkout is updated.

### October 1 production deployment

- SSH access was restored with a temporary public key. Verified Compose configuration and MySQL application access, then created a compressed logical backup at `/root/jajr-backup-20261001-133543.sql.gz`. The file passed `gzip -t` and ended with MySQL's dump completion marker. An earlier dump attempt failed because the application account lacks `PROCESS`; the verified backup used `--no-tablespaces`.
- Fast-forwarded the production checkout to `30c98fc`, built backend and frontend Docker images, and recreated both application containers. MySQL and Redis containers remained running.
- Public smoke checks: homepage and `/api/attendance/settings` returned HTTP 200; unauthenticated `/api/admin/health` returned HTTP 401. The homepage changed from `index-D8nW1z94.js` to `index-p1_XwCc8.js`. Backend logs showed MySQL/Redis startup and face models ready. Two WebSocket 502s occurred while the backend was starting; authenticated sockets connected afterward.
- In the signed-in Chrome admin dashboard, the 7-day trend showed all seven dates; the daily report showed one day present for the employee with two IN records; Maintenance reported MySQL connected, Redis connected, and Socket.IO running. Chrome initially showed a cached admin bundle; a hard refresh loaded the new UI.
- No production attendance, employee, admin, or settings records were changed for smoke testing. The open implementation-plan items still require staging and read-only reconciliation.

### October 1 localhost setup

- Replaced the ignored `backend/.env` with a localhost configuration based on `backend/.env.example`: WAMP MySQL `root` with an empty password, database `facial_attendance_db`, backend port 7000, frontend origin `http://localhost:3000`, development mode, and newly generated local-only JWT and kiosk secrets. Saved the previous local env file under the Windows temporary directory before replacing it. No secret values were committed.
- Added `KIOSK_API_KEY` to the tracked template and a Vite `/socket.io` WebSocket proxy, then corrected the localhost setup guide's database name and ports. The local MySQL connection succeeded, the frontend and proxied settings API returned HTTP 200, and Socket.IO connected through Vite. Redis was unavailable locally and the backend used its in-memory fallback. Test processes were stopped afterward.
- The production `.env` was not changed. If `JWT_SECRET` and `KIOSK_API_KEY` are absent there, Compose uses its checked-in fallback values; replacing them on production needs a coordinated secret rotation and backend recreation because existing admin sessions will be invalidated.

### October 1 scanner timing update

- The operator added distinct generated `JWT_SECRET` and `KIOSK_API_KEY` values to the production `.env` and recreated the backend. Their masked verification reported both as loaded; the public attendance settings route returned HTTP 200 and unauthenticated admin health returned HTTP 401. Existing admin sessions require a fresh sign-in.
- Added a visible elapsed timer to the kiosk camera while a scan is underway. It distinguishes location acquisition from face matching, begins when a frame is captured, and clears after completion, cancellation, or camera shutdown. It measures the wait; it does not alter matching thresholds or geofence rules.
- Frontend lint and production build passed locally. Later public asset checks showed the deployed `index-DyUvixAc.js` and `CameraFeed-DimPR6qf.js` files, including both timer phase labels. Real-device scan timing remains unverified.

The user's screenshot additions and earlier screenshot deletions were left untouched.

## Multi-site geofencing and deployment attempt - 2026-10-02 (Asia/Manila)

### Decisions and implementation

- Reviewed the project and Settings geolocation/geofencing flow with the operator before coding. Agreed that employees may be assigned to one or more sites, but each time-in must be within an assigned site's boundary. A time-out must occur at the same site as its open time-in. An employee must close that session before timing in at another site.
- Agreed to use a 100 m radius for the initial three sites: Main Office (renamed from the existing office and seeded from its stored coordinates), PANICSICAN (`16.6625838, 120.3322232`), and YARD (`16.6137584, 120.3430499`). Existing employees receive Main Office initially; newly registered employees also receive Main Office. A Superadmin can record a reasoned time-out correction when an employee forgets to time out.
- Added the site tables and startup migration, assignment and open-session records, site-aware attendance validation, site administration UI under Settings, and site labels in attendance views. The migration seeds the initial sites and assignments once. Site updates cannot change a boundary or deactivate a site with an open time-in; assignment changes cannot remove the site of an open time-in.
- After the operator reported unclear assignment-save behavior, added per-employee “Saving...”, “Assignments saved.”, and error feedback.
- Committed and pushed the implementation to GitHub `main` as `d6c9a366cc0b54cc308f3c2948ccde408548a214` (`Add multi-site geofencing and assignment feedback`). Unrelated local screenshot and documentation changes were left out of the commit.

### Verification

| Check | Result |
| --- | --- |
| Frontend production build | Passed. |
| Frontend tests | Passed: 9 tests. |
| Focused backend tests | Passed: 6 tests. |
| Selected frontend ESLint and `git diff --check` | Passed. |
| GitHub `main` | Confirmed at `d6c9a36`. |
| Production deployment and live scan | Not completed or verified. |

### VPS status and next session

- The operator reported running `git fetch origin main` on the VPS, but no fetch output or subsequent checkout state was shared. Do not assume production is running `d6c9a36`. No database backup, fast-forward merge, image build, container restart, or post-deployment smoke check for this change was completed.
- Direct SSH from this workspace remained blocked. The VPS recognized the existing `github_actions_key` public key, but its private key was not unlocked in the Windows SSH agent. The operator started the agent in an Administrator PowerShell window. The private key's Windows ACL was restricted to its owner, `ADMINISTRATOR\Dan`, after OpenSSH rejected the earlier broad permissions. A later agent check still showed no identities; a batch SSH check still failed. The operator was asked to run `ssh-add C:\Users\averi\.ssh\github_actions_key` and enter any passphrase locally, without sharing it in chat.
- An incomplete temporary key pair created during an alternative access attempt was removed from the Windows temporary directory. No temporary public key was installed on the VPS.
- Once SSH access works, inspect the VPS checkout and Compose state; make and verify a fresh database backup before the startup schema migration; fast-forward to `origin/main`; build and recreate backend/frontend; then check container logs, the public homepage, `/api/attendance/settings`, and actual site assignment and scan behavior. The operator ended work for the day before those steps.

## Multi-site production deployment - 2026-10-03 (Asia/Manila)

- Confirmed the VPS checkout was on `main` at `04667bb`, two commits behind `origin/main`; the existing untracked nested `jajr_facial_recognition/` folder was left untouched. Local verification passed: 15 backend tests, 9 frontend tests, frontend lint, and the production build. The known large admin-bundle warning remains.
- Created `/root/jajr-backup-20261003-112651.sql.gz` before deployment using `mysqldump --no-tablespaces --single-transaction --quick`. The file was nonempty, passed `gzip -t`, and ended with MySQL's dump completion marker.
- Fast-forwarded the VPS checkout to `d6c9a366cc0b54cc308f3c2948ccde408548a214`, built backend and frontend images, and recreated those two containers. MySQL and Redis remained running; all four containers were up afterward.
- Read-only SQL confirmed active Main Office, PANICSICAN, and YARD sites with 100 m radii. The migration state was recorded, and all nine existing users had one initial Main Office assignment. There were no open site sessions at verification time.
- The public homepage and `/api/attendance/settings` returned HTTP 200; unauthenticated `/api/admin/health` and `/api/admin/sites` returned HTTP 401 as expected. The deployed homepage referenced `index-CpcULOGm.js`. Backend logs showed Redis connected and face models ready. A later public check again returned HTTP 200 for the homepage and settings API.
- A temporary SSH key was used for deployment, then removed from the VPS `authorized_keys` and deleted from Windows Temp. No production employee, attendance, admin, or settings record was changed for testing.
- Remaining live validation: assign the appropriate employees to PANICSICAN or YARD in Settings, then verify real time-in and same-site time-out scans on a physical device. Camera permissions, location accuracy, scan latency, and wrong-site rejection were not tested in this deployment.

## Main Office scan investigation and diagnostic release - 2026-10-03 (Asia/Manila)

- The operator reported slow iPhone scans, unreliable recognition on a lower-spec Chrome phone, and Main Office boundary rejections despite being physically at Main Office. One Chrome attempt took about 4 seconds, and the operator confirmed Precise Location was enabled. The time-out rejection proves a face was matched and an open Main Office session was found; the failed condition was the reported phone location being outside the stored 100 m circle. The browser's actual coordinates and accuracy were not yet available, so a shifted site pin versus an inaccurate device fix remains unresolved.
- Confirmed the stored production Main Office center was `16.61489773, 120.35392216` with a 100 m radius. A local rule check accepts these exact coordinates. Production geofencing was enabled. A blank-frame production probe took about 2.1 s end to end, including about 1.9 s in the server face step; this is not a real-face latency benchmark.
- Fixed the kiosk retry after a boundary rejection so it asks the browser for a fresh location rather than reusing its cached point. Added a visible diagnostic with the server-measured site distance and radius, browser-reported accuracy, and expandable reported coordinates. The 100 m boundary and face-match threshold were not changed.
- Backend tests passed (15), frontend tests passed (10, including a fresh-location retry check), frontend lint and production build passed, and the staged diff passed `git diff --check`. Committed and pushed `8826d71` (`Diagnose geofence rejections and refresh failed location fixes`).
- Created and verified `/root/jajr-backup-20261003-141412.sql.gz`, fast-forwarded the VPS to `8826d71`, rebuilt and recreated backend/frontend, and confirmed all four containers running. Public homepage and attendance settings returned HTTP 200, unauthenticated admin health returned HTTP 401, and the homepage served `index-BD0b8OjV.js`. Backend logs showed Redis connected and face models ready. The temporary SSH key was removed from the VPS and Windows.
- Next: refresh the kiosk on the affected phone, repeat the Main Office scan, and record the displayed distance, reported accuracy, and coordinates if rejected. Compare those readings with the stored site center before changing the pin or radius. Real-device recognition accuracy and iPhone scan latency remain unmeasured.

## Mirrored camera and frontend deployment - 2026-10-05 (Asia/Manila)

- Reviewed kiosk, employee enrollment, mobile capture, and server recognition paths. The web previews had no application-level mirror. Added `docs/FACE_RECOGNITION_CAMERA_MIRRORING.md` and linked it from `docs/README.md`.
- Mirrored the web kiosk video and the employee enrollment video plus face-box overlay with CSS. The kiosk still uploads frames from the original video source, and enrollment still extracts descriptors from the original video. Mobile camera behavior was not changed.
- The focused `CameraFeed.test.jsx` suite passed (2 tests), and the frontend production build passed locally. Commit `58ebc5a` (`mirrored camera`) was pushed to GitHub by the operator.
- Inspected the VPS at `8826d71` with all four Compose services running. The existing untracked nested `jajr_facial_recognition/` directory was left untouched. An initial SQL dump printed a MySQL `PROCESS` privilege error, so it was not used as the deployment backup. A second dump using `--no-tablespaces --single-transaction --quick` completed at `/root/jajr-backup-20261005-090021.sql` (197 KB, completion marker present).
- Fast-forwarded the VPS checkout to `58ebc5a`, built the frontend image, and recreated only the frontend container with `--no-deps`. Backend, MySQL, and Redis containers were not restarted. The public homepage, `/api/attendance/settings`, new CSS, and new kiosk JavaScript returned HTTP 200; the deployed CSS contained the mirror class. No live visual camera test was performed.
- GitHub `origin/main` was at `d19ec5f`, four commits ahead of the deployed checkout. Those commits include Google Sheets synchronization code; the verified live database backup did not contain its `google_sheets_synced` column. The newer backend commits and their schema migration were not deployed. Review and back up the database before that separate release.
- Removed the one-time SSH key from VPS `authorized_keys` and Windows Temp. Also removed the two mistakenly created key files from `/root`. The pre-existing untracked nested directory remains untouched.

## Superadmin manual attendance - 2026-10-05 (Asia/Manila)

- Implemented the approved Superadmin-only Manual Attendance page with one employee card per mobile record. It supports single time-in/time-out and a 30-day historical paired correction, requires an assigned site and reason, and uses Asia/Manila input/display.
- Added database-backed Superadmin authorization, employee/session context APIs, atomic attendance writes, manual provenance metadata, effective and creation timestamps, audit events, and scanner-compatible session locking. Existing Settings time-out correction now links to the shared page/service.
- Updated daily logs and attendance audit views/exports to identify manual records and show their source, creator, reason, and creation time. Reports and date filtering now use Asia/Manila day boundaries.
- Verification passed: frontend lint, frontend build, 10 frontend tests, 15 existing backend tests, four focused manual attendance tests, and backend syntax checks. Mobile screenshots at 320, 360, 390, 430 px, a short 320 px screen, and a 200% zoom layout equivalent are in `docs/manual-attendance-evidence-2026-10-05/`; each showed one card per employee with no page overflow. Live database migration and a real attendance write remain unverified. No production deployment was performed.

## Responsive admin cards and Manual Attendance production release - 2026-10-05 (Asia/Manila)

- Committed the responsive admin card layouts, Superadmin Manual Attendance page, tests, documentation, and screenshots as `6c0220e`. Merged the four newer GitHub commits, retaining their Attendance Audit date-range export alongside the new Asia/Manila filtering and manual-entry fields. Pushed merge commit `60c496d` to GitHub `main`.
- After the merge, 19 backend tests and 10 frontend tests passed. Frontend lint and the production build also passed.
- Confirmed the VPS checkout was at `58ebc5a` and left its untracked nested `jajr_facial_recognition/` directory untouched. Created and verified a fresh MySQL dump at `/root/jajr-backup-20261005-133349.sql` before deployment; it was nonempty and ended with MySQL's dump completion marker.
- Fast-forwarded the VPS to `60c496d`, built the backend and frontend images, applied the repository's `google_sheets_synced` migration, and recreated the two application containers. MySQL and Redis stayed running. Verified that the new `manual_attendance_details` table and `google_sheets_synced` column exist.
- All four Compose services were running afterward. Backend logs showed Redis connected and face models ready. The public homepage and `/api/attendance/settings` returned HTTP 200; the unauthenticated Manual Attendance route returned HTTP 401. No production attendance entry was created for testing, so an authenticated manual entry and its downstream reports remain unverified in production.
- Removed the temporary deployment SSH key from the VPS `authorized_keys` and Windows Temp after verification.

## Open-shift site transfer - 2026-10-07 (Asia/Manila)

- Added a Superadmin-only transfer action to Manual Attendance for an employee with an open time-in. The destination must be another active assigned site. The current session moves to that site while the original time-in record stays intact, so the scanner can time out at the destination.
- Saved each transfer with its previous and destination site names, acting admin, reason, and effective UTC time. The transfer and its audit event commit atomically. Recent employee history and Audit Logs display transfer events separately from attendance records.
- A manual time-out must follow the latest transfer; the same second is rejected because attendance records store seconds while transfer records store fractional seconds. Transfers use the employee lock shared with scanner attendance, and stale session or later-attendance states return a conflict.
- Local validation before the follow-up fix: all 24 backend tests and 12 frontend tests passed, along with frontend lint and production build, backend syntax checks, and `git diff --check`. A production migration, authenticated transfer, and physical scanner time-out at the destination have not been verified. The change has not been deployed.

## Local Manual Attendance error and socket startup - 2026-10-07 (Asia/Manila)

- Reproduced the employee 6 history request returning HTTP 500. The local `manual_attendance_details` table predated the `admin_username` column used by Manual Attendance, and `CREATE TABLE IF NOT EXISTS` did not upgrade it. Added an idempotent column migration and backfill from `admins`, then applied it to the local database. The authenticated employee history endpoint now returns HTTP 200 with 12 records.
- A fresh short-lived admin token returned HTTP 200 from the history, dashboard stats, and chat rooms endpoints. The browser's 401 responses therefore indicate its stored session needs a fresh sign-in; no token values were printed.
- Deferred the admin and chat Socket.IO handshakes until after React Strict Mode's initial development cleanup. Chat starts with polling and can upgrade to WebSocket. Added a Strict Mode regression test. Frontend lint, all 13 frontend tests, and the production build passed.

## Open-shift site transfer production release - 2026-10-07 (Asia/Manila)

- Confirmed the local `main` branch and GitHub tracking branch at `bac200d` with a clean working tree. Immediately before deployment, all 24 backend tests and 13 frontend tests passed locally.
- Confirmed the VPS was on `main` at `60c496d` with all four Compose services running. Its existing untracked nested `jajr_facial_recognition/` directory was left untouched. Created `/root/jajr-backup-20261007-134744.sql` before the update; the dump was nonempty (234,059 bytes) and ended with MySQL's completion marker.
- Fetched `origin/main`, fast-forwarded the VPS checkout to `bac200d`, validated the Compose configuration, built backend and frontend images, and recreated only those two containers. MySQL and Redis stayed running.
- Verified the new `employee_site_transfers` table and the `manual_attendance_details.admin_username` column in the production database. All four containers remained running; backend logs showed Redis connected and face models ready. The public homepage, `/api/attendance/settings`, and new admin JavaScript asset returned HTTP 200. The unauthenticated Manual Attendance route returned HTTP 401 as expected.
- Removed the one-time deployment public key from VPS `authorized_keys` and deleted its private and public key files from Windows Temp. No production attendance record or site assignment was changed for testing. An authenticated site transfer and physical scanner time-out at the destination remain unverified.

## Employee archival implementation - 2026-10-07 (Asia/Manila)

- Added an idempotent `users.is_active` and `users.archived_at` startup migration. Existing employees default to active. A Superadmin-only archive/restore endpoint locks the employee, rejects archiving an open time-in, and saves the status change and audit event in one transaction. Permanent employee deletion now returns a refusal instead of removing a record.
- Employee Directory now has Active, Archived, and All filters with Archive and Restore actions. Archived employees stay available to historical attendance filters and reports when they have activity in the selected period, while current employee counts exclude them.
- Face matching, the browser descriptor list, scanner and manual attendance writes, site assignment changes, and active chat/assistant employee lists exclude or reject archived employees. Restoring preserves prior site assignments, subject to each site's current active state.
- Local validation: archive transaction and migration tests, full backend/frontend suites, lint, and frontend production build passed. The local MySQL migration added both columns, and read-only daily/weekly/monthly report and dashboard calls returned HTTP-equivalent 200. No employee was archived for testing. The production database has not been migrated for this feature, and this implementation has not been deployed.

## Employee archival local checkpoint - 2026-10-08 (Asia/Manila)

- Reviewed the pending archive/restore routes, transaction, migration, scanner guards, directory controls, and historical reporting filters. No additional code changes were needed.
- Re-ran the backend suite (29 passed), frontend suite (14 passed), frontend lint, production build, and `git diff --check`; all passed. The build retains its existing large admin chunk warning.
- Production migration, deployment, and a live archive/restore action remain unverified.

## Portrait guide, site messages, and archival production release - 2026-10-08 (Asia/Manila)

- Pushed `8728d97` (employee archival) and `1205c74` (portrait guide, site rejection messages, and investigation docs) to GitHub `main`. Pre-release local checks passed: 34 backend tests, 16 frontend tests, frontend lint, production build, and staged diff check.
- Confirmed the VPS was at `bac200d` with all four Compose services running and only its pre-existing untracked nested `jajr_facial_recognition/` directory. Verified Compose config and 71 GB available disk space. Created `/root/jajr-backup-20261008-132222.sql.gz` before deployment using `mysqldump --no-tablespaces --single-transaction --quick`. The gzip was nonempty, passed `gzip -t`, ended with the dump completion marker, and was restricted to root (mode 600).
- Fast-forwarded the VPS checkout to `1205c74`, built backend/frontend images, and recreated only those two containers. MySQL and Redis were not restarted. Backend startup reported Redis connected and face models ready. The production `users` table has `is_active` and `archived_at` columns.
- Public homepage, settings API, and `CameraFeed-DUjzjgc3.js` returned HTTP 200; the asset contains `required_time_out_site`. Settings returned `geofencing_enabled: true`, and unauthenticated `/api/admin/sites` returned 401. No attendance scan or site assignment was changed for testing. The affected SUNDARA request, production pin/assignment, and physical camera view remain unverified.
