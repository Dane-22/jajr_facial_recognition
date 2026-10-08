# Issue investigations

## P1 — SUNDARA scan reports distance from PANICSICAN (reported 2026-10-08)

**Status: Open. Root cause unconfirmed; local message clarification is not deployed.**

**Reported symptom.** A coworker physically at SUNDARA saw approximately “3,504 m from PNICSICAN (allowed 100 m)” with browser-reported accuracy of 99 m. The seeded site is spelled **PANICSICAN** in this repository; verify the exact displayed spelling. This is a **rejection**, not evidence that attendance was recorded at PANICSICAN or that GPS caused the failure. The date/time, full main error line, reported latitude/longitude, employee ID matched by the server, and scan mode are not yet available.

### Confirmed validation flow in the current repository (reviewed 2026-10-08)

1. The web kiosk obtains coordinates with `getCurrentPosition` (`enableHighAccuracy: true`, 10 s timeout, up to 15 s cached) and sends them with a JPEG. After a boundary rejection it discards its cached fix and sets `maximumAge: 0` for the **next scan**. Browser accuracy is displayed but is **not used** by the server's boundary calculation ([CameraFeed.jsx](frontend/src/components/CameraFeed.jsx)).
2. The server matches the face to a numeric employee ID. It selects `OUT` when `employee_site_sessions` has an open row for that ID; otherwise it selects `IN`. It then calls `logAttendance` with that ID and the submitted coordinates ([faceRoutes.js](backend/routes/faceRoutes.js)). The failed response does not include the matched ID.
3. `logAttendance` locks the user row, reads **active assigned sites** through `employee_sites` and `sites`, and reads the open session. `attendanceSiteDecision` first requires at least one active assignment, then applies the open-session rule ([attendanceController.js](backend/controllers/attendanceController.js), [siteRules.js](backend/utils/siteRules.js)).
4. For an open session, `OUT` must occur inside **that session's site**. An out-of-boundary response names the required time-out site, which could be PANICSICAN even when the phone is elsewhere. An inactive/removed assignment for the open site gives a separate 403 error.
5. For a new `IN`, only active assigned sites are candidates. The nearest **matching** site inside its own radius wins. If none match, the 403 response names the assigned site with the smallest **distance minus radius**. PANICSICAN could therefore be the selected comparison site when SUNDARA is absent, inactive, unassigned to the matched employee, pinned incorrectly, or outside its configured boundary. The name is **not a detected physical location**.
6. The boundary rejection occurs before `INSERT INTO attendance_logs`; the transaction rolls back. That establishes the **current code's intended no-write path**, but whether this particular production request left no row still needs a read-only production check. A successful retry is a separate request and may create or toggle attendance.

If the current server matched the intended employee, there was no open session, SUNDARA was active and assigned, and the supplied point was inside its configured radius, the rule would choose SUNDARA. The reported failure means at least one of those inputs or conditions differed, or deployed backend behavior differs. A wrong face match is another possibility; **none is confirmed**. The 99 m value is the phone's uncertainty estimate, not a measured distance to SUNDARA and not proof that the fix was correct. We cannot compare the 3,504 m with SUNDARA until the reported point and both production site centers are known.

### Production and local evidence (2026-10-08)

| Check | Result | Limit |
| --- | --- | --- |
| [Public homepage](https://jajr.xandree.com/) | HTTP 200; references `index-DijkNHUE.js`, which references `CameraFeed-CGxexjHJ.js`. The served camera bundle contains `outside_site_boundary`, the distance notice, and forced fresh-location retry. | Confirms the public **frontend** behavior, not the backend commit or employee data. It still has the prior horizontal guide, so current uncommitted UI work is not deployed. |
| [Public `/api/attendance/settings`](https://jajr.xandree.com/api/attendance/settings) | HTTP 200, `geofencing_enabled: true`. | Does not expose sites or assignments. |
| Protected `/api/users`, `/api/employees`, `/api/chat/rooms` without credentials | HTTP 401 each. | No employee or site records were read. |
| VPS read-only `git rev-parse HEAD` by SSH | Authentication failed (`Permission denied`). The computer/browser inspection tool also could not start. | Current backend commit, production SQL, logs, and signed-in admin views remain inaccessible from this session. The worklog last verified deployment of `bac200d` on 2026-10-07, which is historical evidence only. |
| Local source compared with last verified deployment commit `bac200d` **before** message clarification | On 2026-10-08, `git diff bac200d -- backend/utils/siteRules.js backend/routes/faceRoutes.js` was empty. The then-current `attendanceController.js` changes concerned archived-employee checks, not geofence selection. | The local message change below now makes that diff nonempty. If the running backend is still at `bac200d`, its earlier site decision path matches the pre-change review; this does **not** verify which backend image is running now. |
| Local development MySQL and migration | Local active sites are Main Office, PANICSICAN, and YARD, each 100 m; SUNDARA is absent. The migration seeds only those three. | **Not evidence of production configuration.** SUNDARA could have been added on the VPS. |
| Initial focused site-rule tests, before the message change | Three tests passed on 2026-10-08, including same-site time-out and nearest matching assigned site. The expanded post-change results are below. | They verify local rule behavior, not the failed production request. |

### Read-only diagnostics still needed

1. Record the failed scan's approximate timestamp, full main error line, the values under **Show reported coordinates**, browser/device, and whether precise location was enabled. Retain only the relevant response metadata; do not collect the JPEG or token. The main error line distinguishes a required time-out site from a new time-in outside assignments.
2. With authorized read-only access, use the protected `GET /api/admin/sites` response (sites, employee assignments, and **current** open sessions) or read-only production SQL. Inspect SUNDARA and PANICSICAN IDs, active flags, centers, and radii, plus the affected employee's active site assignments. Confirm SUNDARA's intended pin and radius with the site owner. Compare the original reported point with both configured centers using the formula in `siteRules.js`. The **intended** radius is still unverified; PANICSICAN's 100 m notice says nothing about SUNDARA's radius.
3. Reconstruct the employee's open-session state **at the failed request time**, using attendance and transfer history if available. The Superadmin-only `GET /api/admin/manual-attendance/:userId` returns recent attendance and transfers (at most 20 combined entries), which may help; a wider read-only SQL history may be needed. Current session state alone cannot prove historical state. Determine which numeric employee ID the face endpoint matched if a permitted diagnostic trace retained it. The rejection response does not expose the ID, and current code does not persist it for boundary rejections; retrospective identification may be impossible.
4. Read attendance rows and attendance audit events for the matched ID in a narrow window around the failed request, including any immediate retry. Confirm whether the rejected request created none. Correlate by timestamp and request logs where possible; the recent-history API may be insufficient, and a row near that time may belong to a separate successful scan. Do not attribute a row to the rejection solely by proximity.
5. On the VPS, read the checkout commit and running backend image ID/container creation time, then compare with the public frontend asset and local `siteRules.js`/`attendanceController.js`. The public bundle alone cannot verify backend parity.
6. For a **fresh location-only** reading, open a non-scanner page on the same HTTPS origin (for example `/admin/login`), then use browser geolocation with `maximumAge: 0`. Do **not** leave the automatic kiosk open for this diagnostic. No location-only control exists in the current kiosk. Where browser developer tools are available, `navigator.geolocation.getCurrentPosition(p => console.log(p.coords.latitude, p.coords.longitude, p.coords.accuracy), e => console.error(e.message), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })` reads location only; it does not submit attendance. Compare that reading with a trusted on-site point.

### Controlled live attendance tests (separate from read-only diagnostics)

Only after the production configuration, identity, and open-session state are understood, use an authorized test employee and a controlled test window. A real scan **can create an `IN` or `OUT` record**; never use a repeat face scan merely to refresh GPS. Record the pre-test attendance/session state, make one planned scan, then compare post-test rows and session state. Stop and investigate any wrong identity or unexpected write before another scan.

### Local message clarification (implemented 2026-10-08; not deployed)

The web kiosk uses `reason: outside_site_boundary` to clear its cached fix and request fresh coordinates on the next scan. The mobile client displays the server's `error` text. The local change therefore retains that reason, the HTTP 403 status, distance/radius fields, geofence decisions, and retry behavior. It adds `boundaryContext: required_time_out_site` or `closest_assigned_boundary` to boundary responses. Missing active assignments now carry `reason: no_active_site_assignment`; an inactive/missing assignment for the open session's site carries `reason: inactive_open_session_assignment`. The server and kiosk messages describe **reported coordinates relative to configured boundaries**, not the employee's physical site. No radius, recognition threshold, attendance rule, or production data was changed.

If production checks later reveal a configuration or open-session error, correct it through the existing authorized workflow. The message change alone does **not** resolve the SUNDARA incident; its root cause remains unconfirmed.

**Local validation, 2026-10-08:** Eight focused backend rule/controller tests and four kiosk tests passed. They cover all four rejection distinctions, the unchanged `outside_site_boundary` reason and 403 status, overlapping boundaries, and rollback before any attendance/session write. The kiosk tests cover both boundary contexts and an older response without the new context field, and confirm the next geolocation request uses `maximumAge: 0` after rejection. Frontend lint and `git diff --check` passed. These checks do not establish what happened in the production request.

### Acceptance criteria for a later fix and release

- With no open session, a recognized employee assigned to **active SUNDARA** and a reported point within its intended configured radius records exactly one `IN` at SUNDARA and opens a SUNDARA session.
- With an open time-in at one site, a time-out scan is rejected with the **required time-out site** stated clearly **when the reported point is outside that open session site's boundary**; no `OUT` row or session change occurs. If boundaries overlap and the point is inside the open site's boundary, time-out may succeed at the open site even when the point is also inside another site's boundary.
- Every geofence/assignment rejection leaves attendance rows, open sessions, and attendance audit events unchanged. A later successful retry is accounted for separately.
- Missing/inactive assignments and out-of-boundary coordinates have distinct messages; the named comparison site is described as a configured/assigned site, not the employee's detected location.
- Production site pins, assignments, backend commit/image, and a consented device result are verified before attributing the incident to GPS or declaring it resolved.

### Production evidence checklist for the operator (read-only)

- **Admin interface:** In Sites, capture SUNDARA and PANICSICAN IDs, active flags, latitude/longitude, and configured radii; confirm the intended SUNDARA pin/radius with the site owner. Capture the affected employee's numeric ID, active assignments, and current open session. The current session does **not** establish its state at the failed scan time.
- **Admin interface, Superadmin:** In Manual Attendance, review the employee's recent attendance and site transfers around the failed scan, including any successful retry. The view exposes only recent history and cannot by itself attribute a nearby row to the rejected request.
- **From the affected device/person:** Obtain the approximate failed-scan time (with timezone), full main error line, **Show reported coordinates** latitude/longitude, accuracy, and whether precise location was enabled. A fresh location-only reading on a non-scanner page is preferable to repeating an attendance scan.
- **Requires backend logs or diagnostic trace:** Verify the numeric employee ID actually matched by the rejected request, its response branch, and the request time. The rejection response does not include that ID, and it may not have been logged.
- **Requires production database history or sufficiently complete admin history:** Reconstruct the open session **at that time** from attendance and transfer events; check rows and audit events in a narrow window and separate the rejected request from any retry. Current admin state alone is insufficient.
- **Requires server/hosting access:** Read the current checkout commit and running backend container image/creation time. The public frontend asset and the 2026-10-07 worklog are insufficient to prove the current backend version.

## Revalidation of the September 30 findings (reviewed 2026-10-08)

The historical sections below remain as a record of the September 30 investigation, **not a description of the current scan path**. [Documentation.md](Documentation.md) describes the later server-side scanner architecture but is dated September 30 and has stale status text: its “last attendance row/12-hour rule,” no-production-deployment, and no-SSH-access statements must not replace the current open-session rule and later [deployment history](worklog.md). Statuses here refer to current repository source unless a production observation is explicitly named.

| Historical finding | Status | Current evidence and limit |
| --- | --- | --- |
| Expo mock recognition and permissive login | **Fixed in source** | `mobile/src/services/faceRecognitionService.js` posts the captured image to `/face/attendance`; `LoginScreen.js` calls `/admin/login` and `/face/session`. `CameraScreen.js` no longer writes a local match. Installed mobile builds were **not revalidated**. |
| Mobile sync import, descriptor mapping, and private LAN URL | **Fixed for the active path** | `DashboardScreen.js` no longer calls offline sync; the server rejects `/attendance/batch-sync`; `api/client.js` defaults to production HTTPS. Dormant `syncService.js` and SQLite helpers remain; no offline sync claim should be made. Installed mobile configuration was **not revalidated**. |
| Weak browser matching on low-resolution faces | **Still open as an accuracy question** | The ordinary kiosk now uploads a JPEG for server detection/matching; `faceRecognition.js` checks one face, at least 80 px wide, distance `< 0.4`, and margin `>= 0.05`. Enrollment now collects three samples. No consented low-resolution device accuracy study has been run. The Settings threshold/resolution preferences still do not tune the server path. |
| Five-second browser camera shutdown after a missed face | **Fixed in the active kiosk path** | `CameraFeed.jsx` runs a motion/periodic full-frame upload loop; its camera is stopped on hide/unmount, not by the old five-second `cameraManager.js` detector timer. That old utility remains unused. A physical-device scan was **not revalidated**. |
| Expensive browser model/descriptor startup and slow low-spec scans | **Not revalidated for device performance** | `App.jsx` lazy-loads the kiosk; it does not load face models or all descriptors. `AdminLayout.jsx` still imports many admin views and the build has a large admin chunk. Server inference and upload/network time now dominate different parts of the path; no current low-spec latency benchmark is available. |
| Name-label collision causing wrong browser employee ID | **Fixed in source** | `faceRoutes.js` uses the numeric ID returned by server-side `identifyFace`; the active kiosk does not submit a name as identity. A wrong biometric match remains possible and is a separate accuracy issue. |
| Browser-distributed kiosk key and public `/api/employees` / chat fallback | **Fixed for those routes** | The active kiosk performs server-side matching; production middleware rejects the legacy kiosk key for the old attendance route. Employee and chat routes require admin JWTs. On 2026-10-08, production `/api/users`, `/api/employees`, and `/api/chat/rooms` returned 401 without credentials. The public kiosk still relies on an Origin check rather than device authentication. |
| Compose DB/backend password mismatch | **Fixed in source** | Compose now gives DB and backend the same `DB_PASSWORD` default. Production environment values were **not revalidated**. |
| Automatic SQL import and legacy `initDatabase.js` | **Still open in the legacy script** | `backend/initDatabase.js` references a missing root `database.sql` and a different database name. It is not the Compose startup migration path; no current production initialization failure was observed. |
| Camera Playwright tests as evidence of recognition accuracy | **Still open** | UI/API tests do not measure false matches, misses, or actual camera performance on target phones. The 2026-10-08 site-rule tests verify geofence branching only. |
| Production CORS and model cache headers | **Fixed in observed production responses** | On 2026-10-08, settings returned `Access-Control-Allow-Origin: https://jajr.xandree.com`; the recognition model returned one-day `Cache-Control`. The September 30 localhost CORS and absent-cache observations are historical. |
| Production kiosk-key acceptance and 7 MB browser model download | **Fixed for the active web flow** | Public production frontend bundle `CameraFeed-CGxexjHJ.js` contains the server-scan diagnostic; current kiosk does not download face models for matching. `/api/users` returned 401 without credentials. Admin enrollment still downloads the model files. Exact backend commit and cold-load timing are **not revalidated**. |

The historical risk of a 0.4 threshold rejecting some genuine faces is still relevant, but this incident's **boundary rejection** follows a face match and location/site decision. It is not evidence for changing the recognition threshold.

## Historical investigation: low resolution face scans and slow mobile loading

**Historical baseline (inspected 2026-09-30):** The remainder of this document preserves the old implementation and HTTP observations as they were recorded then. The revalidation table above assigns each finding its current status as of 2026-10-08. Do not treat the old present-tense statements below, or stale portions of [Documentation.md](Documentation.md), as current production facts.

Inspected on 2026-09-30. This is a source review plus inspection of the existing frontend build artifacts. No physical low resolution phone or timed browser trace was available, so device specific accuracy and latency are **not measured**. The findings below distinguish confirmed behavior from likely contributors.

## P0 — Expo mobile attendance can attribute a scan to the wrong employee

`mobile/src/services/faceRecognitionService.js` ignores the captured base64 image, contains only commented face inference code, and returns `employees[0].id` whenever the local employee list is nonempty. `mobile/src/screens/CameraScreen.js` treats that ID as a successful scan and writes attendance. This is a correctness and identity risk even with a high quality camera. With no cached employees it throws a sync first error. The mobile app also accepts any nonempty login credentials in `mobile/src/screens/LoginScreen.js`.

**Reproduce by code path:** add two cached employees, capture any image, and follow `identifyEmployeeOffline`; the first ID is returned without reading image content. Do not use mobile attendance as a verified face match until this is replaced.

## P1 — Mobile enrollment and sync path is incomplete

`syncEmployeesToLocalDB` exists in `mobile/src/database/queries.js` but is never called. `DashboardScreen.js` imports `syncOfflineData` from that file although the function is exported by `mobile/src/services/syncService.js`. A fresh device has no employee embeddings; its Sync button can fail when invoked. The mobile client also uses a hardcoded LAN URL in `mobile/src/api/client.js`. Its local cache expects `faceDescriptor`, while the `/api/users` response exposes `face_descriptor`; mapping and authorized retrieval would be needed.

## P1 — Browser matching is fragile for small, noisy faces

`frontend/src/components/CameraFeed.jsx` and `EmployeeList.jsx` both use default `TinyFaceDetectorOptions` and a single captured enrollment descriptor. There is no measured face-size/blur/exposure check, no multi-pose enrollment, and no alternative capture path when the detector fails. `cameraManager.js` asks for an *ideal* 640×480 stream; this does not guarantee the actual camera resolution. On a low resolution front camera, a small face occupies few source pixels, so detection or landmarks can fail. The fixed `0.4` descriptor distance cutoff for logging can reject faces that the `0.6` matcher labels as known. That cutoff may be deliberately strict; changing it without accuracy testing could create false matches.

**Observed code path:** `faceApiLoader.js` creates a `FaceMatcher(..., 0.6)`, while `CameraFeed.jsx` logs only when distance is below `0.4`. Admin `confidence_threshold` and `camera_resolution` settings in `frontend/src/components/Settings.jsx` are saved in `backend/controllers/adminController.js` but are not read by the kiosk, so changing them does not tune the live scanner.

## P1 — Browser scanner can lose a low quality face after five seconds

`cameraManager.registerFaceDetection()` starts a five second timer after each detection. If subsequent detections fail, it stops the main camera and starts a new 320×240 motion-monitoring stream. A still user or a face the detector repeatedly misses can remain in that mode until motion is detected or they manually reactivate. This is a likely contributor to “it can't detect well” on weak cameras. The monitoring camera still consumes resources; it is not a full stop of camera use.

## P1 — Browser startup and scan work are expensive on low specification phones

The kiosk waits for WebGL initialization, all three face models, and all enrolled user descriptors before showing the camera (`frontend/src/App.jsx`, `frontend/src/utils/faceApiLoader.js`). The recognition model binary is 6,444,032 bytes, and the three model binaries together are about 7 MB before parse and inference work. Existing `frontend/dist/assets/` contains an approximately 1.36 MB main JS file and 0.64 MB face-api chunk; these are disk sizes of an existing build, not a measured network transfer. `App.jsx` statically imports both the kiosk and admin components, and `AdminLayout.jsx` statically imports the dashboard, reports, chat, and other admin views, so route code is not separated at the source level.

During scanning, `CameraFeed.jsx` runs detector-only passes every 150 ms after prior work finishes and a full landmarks/descriptor pass about once per second. These jobs run with rendering and UI updates on the browser's main thread. `detectFaces` depends on dwell state, so React state changes can recreate the detection loop. The actual frame rate, memory use, and time to first scan need profiling on target devices.

## P2 — Identity labels can be ambiguous in the browser

`faceApiLoader.js` labels embeddings with `user.name`, and `CameraFeed.jsx` passes that label as `userId`. `backend/controllers/attendanceController.js` resolves a nonnumeric `userId` by querying the first user with that name. Two employees with the same name can produce an incorrect attribution even if recognition found the intended descriptor. The matcher should carry a stable numeric ID independently of the display name.

## Related project risks found during review

- The kiosk key is embedded in `faceApiLoader.js` and `AttendanceCard.jsx`; the mobile sync service has a development fallback. A browser-distributed key cannot prove a face was scanned. The server signs identity claims supplied by the client but receives no evidence of a match.
- `/api/employees` read routes are public, and `backend/routes/chatRoutes.js` replaces missing or invalid authorization with an admin identity. Review these before exposing the system beyond a trusted test environment.
- Docker Compose uses different default MySQL passwords for the DB and backend services. The SQL dump is not automatically imported, and `backend/initDatabase.js` names a missing `database.sql` file.
- Existing camera Playwright tests exercise camera UI paths, not genuine low resolution recognition accuracy. There are no mobile model or device benchmarks.

## Evidence needed before tuning thresholds

Record device model, OS/browser, actual camera track width/height and frame rate, time to first usable scan, detector latency, descriptor latency, face box width in source pixels, match distance, failure reason, and memory/CPU where available. Use consented enrollment and test images across lighting and pose. Keep false accepts, false rejects, and no-face detections separate; a faster scanner with wrong identities is not an improvement.

## Production investigation: `https://jajr.xandree.com`

Read-only checks on 2026-09-30:

| Check | Observed result | Meaning |
| --- | --- | --- |
| `/` and `/admin/login` | `200` HTML; homepage references the same hashed assets as local `frontend/dist/index.html` | The current browser build is being served and SPA routing works |
| `/api/attendance/settings` | `200` JSON | Public API route reaches Express |
| `/api/users` without key / with key embedded in the frontend | `401` / `200`; response body was not inspected | Current kiosk key agrees with the live backend; descriptor fetch is reachable |
| All three face model manifests and binaries | `200`, expected content types and sizes | Files are deployed; this does not prove in-browser model initialization |
| `Origin: https://jajr.xandree.com` on the settings API | Response advertises `Access-Control-Allow-Origin: http://localhost:3000` | `FRONTEND_URL` is missing or stale in the running backend |
| Recognition model response | 6,444,032 bytes; no explicit `Cache-Control` or `Content-Encoding` response header | A cold mobile visit transfers a large model; repeat behavior depends on browser cache/PWA state |

**Confirmed production configuration gap:** `docker-compose.yml` does not pass `FRONTEND_URL` into the backend container, although `backend/server.js` uses it for HTTP and Socket.IO CORS. The domain's same-origin browser requests do not normally require CORS, so this finding alone does not explain a failing kiosk. Cross-origin clients and any changed frontend origin can be affected. The current live kiosk key was accepted, so the different-key scenario mentioned in deployment planning is not the observed problem today.

**Production-only mobile app gap:** `mobile/src/api/client.js` points to a private `192.168...:5000` address, not the production HTTPS domain. An installed Expo app away from that LAN cannot contact production; the Dashboard sync import defect and mock recognition also remain.

**Likely production performance gap:** localhost avoids network transfer and often runs on a stronger development machine. Production loads roughly 7 MB of model binaries plus JS before the kiosk is ready. The deployed model files exist, but their response headers do not show an explicit long-lived cache policy. The current Vite PWA runtime cache rule targets a remote face-api URL while model loading uses local `/models` files. Cold mobile network and CPU costs can therefore dominate. This is a source and HTTP-header inference, not a measured phone loading time.

**Not established by HTTP checks:** permission and WebGL behavior on the affected phone, exact camera track resolution, model initialization success, recognition accuracy, signed attendance POST, production database consistency, and whether a previously installed service worker serves stale assets. The existing `SERVER_DEPLOYMENT.md` records an earlier SSH session in which login, database-backed reads, and WebSocket joins worked; that prior observation is narrower than a full current production test.
