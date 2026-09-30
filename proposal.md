# Proposal: reliable scanning on low resolution and low specification phones

**Historical proposal:** Implementation has started. See [Documentation.md](Documentation.md) for the current architecture and remaining release checks.

This is a prioritized implementation plan based on [issue.md](issue.md). Values marked *initial target* are acceptance goals to validate with real devices, not measured results or promises.

## 1. Make mobile attendance safe before optimization (P0)

1. Remove the success fallback in `mobile/src/services/faceRecognitionService.js`. Until a real recognizer is installed, return an explicit unavailable/error result and prevent `CameraScreen.js` from writing an attendance row. Do not interpret an arbitrary photo or a missing model as a match.
2. Implement a supported on-device face detector plus embedding model, or explicitly route captures to a secured server recognizer when online. Pick one model family for enrollment and recognition; descriptors from different embedding models cannot be compared directly. Prefer a smaller, quantized mobile model only after evaluating its accuracy on the target devices. Package/version models with the app and load them once, outside the capture button path.
3. Detect exactly one usable face, assess minimum source-pixel face size, focus/blur, exposure, and pose, then compute an embedding. Reject ambiguous, poor quality, or unmatched captures with specific guidance. Never choose the first employee as a fallback. Use a stable employee ID and require more evidence for borderline matches; tune the decision threshold from a consented validation set, including lookalikes and unknown people.
4. Replace placeholder login with backend authentication and design device authorization for offline operation. Do not ship a shared secret in the mobile bundle as the sole authorization for attendance. Define how offline logs are verified, deduplicated, and audited when uploaded.

**Acceptance:** an arbitrary image, a no-face image, and an unknown person never log attendance; a matched person logs only their own ID; no model or no cache produces an actionable error.

## 2. Repair mobile data flow (P1)

- Import `syncOfflineData` from `mobile/src/services/syncService.js` in `DashboardScreen.js` and exercise the button end to end.
- Add an authenticated employee descriptor refresh that maps backend `face_descriptor` to the mobile cache format. Use transactional updates and avoid deleting the old cache until the new one is complete. Define cache expiry and removal of deleted employees.
- Configure the API base URL per environment instead of a fixed LAN IP. Check the backend's actual port and HTTPS endpoint.
- Control still image size and JPEG quality before converting to base64, or use a file/bitmap route that avoids a large JS base64 string. Measure capture, decoding, detection, and matching separately. Avoid shrinking the **face** below the quality threshold just to reduce bytes.
- Make `IN`/`OUT` determination explicit for offline records and define how a later server sync resolves conflicts. Show pending and rejected records in the UI.

**Acceptance:** fresh install can authenticate and cache descriptors; scanning and sync work after reopening the app; a failed sync retains unsynced records and explains the failure.

## 3. Improve the browser detector and enrollment (P1)

- Record `MediaStreamTrack.getSettings()` after camera start. Show a face guide and actionable prompts for moving closer, lighting, and holding still. Base minimum face size on **actual source pixels**, not CSS preview dimensions. Try the rear camera when it has materially better optics and the user can position it.
- Expose detector `inputSize` and `scoreThreshold` as tested internal parameters. Try a larger detector input only for repeated no-face cases or a still-frame retry; keep the normal live pass light. Test each choice against low resolution captures because larger inputs cannot recover detail absent from the sensor.
- Capture several good enrollment embeddings under modest pose and lighting variation. Validate one face per capture, reject poor images, and retain an explicit model version with each descriptor. Re-enroll when the chosen embedding model changes.
- Carry numeric user IDs through `FaceMatcher` labels and attendance requests; keep names as display metadata. Handle duplicate names deterministically.
- Wire admin camera and match settings to the kiosk only after defining ranges and tests. Keep the distinction between detector confidence and embedding distance clear; lower embedding distance means closer match. Do not simply relax the current `0.4` logging cutoff to `0.6` without measuring false accepts.
- Replace or lengthen the five second no-face shutdown for active scan sessions. If motion monitoring is retained, make its resource use and recovery state visible; allow a manual retry immediately.

**Acceptance:** on a defined set of low resolution phones, report no-face, false reject, and false accept rates separately, and show the actual capture resolution and match distance in diagnostic logs without storing raw face images by default.

## 4. Reduce browser startup and per-frame cost (P1)

- Split kiosk and admin routes with dynamic imports. Load reports, charts, spreadsheet/PDF exporters, and chat only when opened. Measure build chunks and actual network transfer after the change.
- Cache local model files with versioned URLs and an explicit update strategy. Verify first visit and warm visit. The current PWA runtime cache targets a remote model URL, while current model loading uses `/models`.
- Start camera permission and model downloads concurrently where UX permits; show distinct progress for camera, models, and employee data. Handle offline or unauthorized descriptor fetch as an error rather than a scanner that appears ready with no matcher.
- Make one nonoverlapping detection scheduler, pause it when the page is hidden or camera is inactive, and reduce detector passes on slow devices based on measured inference time. Reuse cached recognition only while the face remains confidently tracked, and prevent a stale label from logging a different person.
- Avoid unnecessary React state updates per frame and profile WebGL setup versus CPU fallback on representative low-end browsers. Choose a backend/device strategy from the data rather than forcing WebGL everywhere.

**Initial targets:** time to first usable scan under 5 seconds on a warm 4G connection and under 10 seconds cold on selected devices; responsive controls while scanning; no overlapping inferences. Revise targets from measured baseline and network conditions.

## 5. Verify, release, and protect data

1. Establish a baseline on at least one low resolution Android phone, one low specification phone, and a reference device. Capture cold/warm start, model download, camera readiness, P50/P95 detection and embedding times, actual stream settings, memory, and battery trend. Compare the same device and image conditions after each change.
2. Build a consented test set with enrolled, unknown, and lookalike subjects, varied light and pose, and small face boxes. Evaluate false accept and false reject rates before selecting thresholds. Add automated tests for no-face, multiple-face, duplicate-name, low-quality, missing-model, and stale-cache cases. Run physical-device checks; a mocked Playwright camera is insufficient for optical quality.
3. Add server-side controls for biometric descriptor access, per-device authorization, replay/deduplication, and audit. Remove chat's unauthenticated admin fallback and public employee reads if not explicitly required. Rotate any exposed keys. Document retention and deletion of descriptors and optional diagnostic captures.
4. Test local and Docker deployment with matching DB credentials, schema import/migration, HTTPS on phones, and the configured API endpoint. Roll out behind a limited pilot before enabling general attendance writes.

## Suggested implementation order

**First:** disable the mobile mock success path and fix mobile sync import. **Next:** instrument and benchmark the browser camera on actual phones, repair ID handling and camera timeout, then improve enrollment. **Then:** implement validated mobile recognition and data refresh. **Finally:** optimize bundle/inference and run an accuracy and security pilot before production use.

## Production deployment corrections and verification

1. Pass `FRONTEND_URL=https://jajr.xandree.com` to the backend container through `docker-compose.yml`, rebuild/recreate that service, and verify the resulting API and Socket.IO CORS headers. Keep the browser kiosk's same-origin `/api` and `/socket.io/` paths. CORS is a configuration correction, not a substitute for debugging camera inference.
2. Make the MySQL app password the same for `db` and `backend` through explicit environment values. On an existing MySQL volume, changing `.env` alone does not change the database user's stored password; verify credentials before changing them. Compare the deployed backend image/version and schema to the frontend build if requests fail.
3. Set the Expo client's production API endpoint to the domain over HTTPS through an environment-specific configuration, with a separate local emulator/device value. Do this alongside real authentication and recognition work; the current app must not upload mock face matches.
4. Add versioned caching for `/models/` and immutable hashed `/assets/`, and verify cold and warm mobile transfer sizes. Ensure the PWA update flow can replace stale code and models together. Test browser storage cleared, then an installed PWA update, because those paths can behave differently.
5. From the affected phone on the production domain, capture a browser Network/Console trace and report `getUserMedia` permission, `videoWidth/videoHeight`, `MediaStreamTrack.getSettings()`, model load errors, WebGL/CPU backend, `/api/users` status, match distance, and attendance POST status. Do not log raw descriptors or face images in ordinary diagnostics. Time each phase from navigation to first usable scan. Repeat on localhost or local HTTPS with the same phone and browser to isolate network from device inference cost.
6. Verify a signed attendance event using a consented test employee and inspect the exact failed response if it does not log. Avoid writing test attendance to real employee records. Check Nginx and backend logs for any `401`, `403`, `429`, `500`, or `502` at the same timestamp.

The live checks so far show that the homepage, API routing, kiosk key, and model URLs are available. A physical-phone trace is the next evidence needed to identify why recognition itself performs differently in production.
