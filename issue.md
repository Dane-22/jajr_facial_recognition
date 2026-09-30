# Investigation: low resolution face scans and slow mobile loading

**Historical baseline:** This investigation describes the old implementation. The current code and outstanding validation are documented in [Documentation.md](Documentation.md).

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
