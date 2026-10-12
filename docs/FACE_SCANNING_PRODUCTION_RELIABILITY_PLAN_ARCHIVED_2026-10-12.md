# Discussion plan: face scanning and production reliability

**Status:** Implementation authorized by the user's later "proceed" instruction and underway. Production deployment and physical-device validation have not occurred. See [Documentation.md](Documentation.md) for the implemented architecture.

## Implementation progress (2026-09-30)

| Work | State |
| --- | --- |
| Replace Expo mock matching and login; use online server recognition | Implemented, Android bundle passes |
| Use server recognition for browser scans, reducing low-spec phone model work | Implemented, browser production build passes |
| Open shared browser kiosk without admin sign-in or scan buttons; keep Expo scanner/admin token separation; reject the legacy kiosk key in production | Implemented, backend auth tests pass; automatic scan needs device pilot |
| Three-sample enrollment and conservative matching | Implemented, accuracy unmeasured |
| Compose model packaging, production origin, and PWA caching | Code updated; Docker and deployed behavior unverified |
| Low-resolution and low-spec phone latency/accuracy pilot | Pending affected devices, consented test identities, and production release window |

The rest of this document records the original discussion gates. The new architecture moves both scan clients to server inference; its upload and server timing must be measured before claiming latency targets.

This plan turns [proposal.md](proposal.md) into a sequence of decisions and reviewable work. The reported problem affects **both** the browser kiosk/PWA at `https://jajr.xandree.com` and the Expo app in `mobile/`. Production does **not** require offline attendance; the user reports that the project works locally but not in production. Findings and current evidence are in [issue.md](issue.md).

## What is known

- The production site serves the current browser build, its face model files, and its API routes. The kiosk key is accepted. These checks do not verify camera or recognition behavior on the affected phone.
- The browser scanner uses a fixed 0.4 face descriptor distance cutoff for attendance, default Tiny Face Detector settings, one enrollment descriptor per employee, and a five second no-face timeout.
- The Expo app's current recognition service returns the first cached employee without evaluating the image. Its login, employee cache refresh, sync import, and production API address also need work.
- Production backend CORS advertises localhost because the Compose environment does not pass the intended frontend origin. Same-origin kiosk requests can still work, so this should be corrected but should not be assumed to be the scanning root cause.
- No physical-device baseline, recognition error rates, or production scan trace has been collected.

## Decisions for our discussion

| Decision | Options and tradeoff | Recommended starting point |
| --- | --- | --- |
| Client scope | Browser kiosk/PWA, Expo app, or both. Maintaining both requires two camera and recognition paths. | **Answered: both.** Diagnose each separately; use common identity and acceptance rules. |
| Expo attendance before real recognition | Disable the mock success path, or suspend the entire Expo attendance feature. | Disable attendance writes from an unverified scan immediately when implementation begins. |
| Production connectivity | Offline logs and matching, or online operation with explicit network failure. | **Answered: online production.** Do not make offline sync a prerequisite for production scanning. |
| Expo recognition architecture | On-device model needs a mobile integration; server recognition needs a protected image upload and backend inference. | **Recommend an online server-backed Expo path** after validating privacy, latency, and enrollment compatibility. Keep the browser path measurable and consistent with the same employee IDs. |
| Browser threshold and enrollment | Keep current strict cutoff, or calibrate a new cutoff and multi-sample enrollment against consented data. | **Recommend wrong-person acceptance as the higher-risk error.** Keep uncertain scans unlogged with a retry or supervised fallback. Calibrate any threshold from real captures. |
| Camera idle behavior | Keep motion monitoring, extend timeout, or use an explicit start/stop session. | **Recommend a short, explicit scan session** on phones; keep the camera active during that session, then release it on success, cancel, timeout, or screen exit. |
| Deployment scope | Fix configuration and caching now, or include broader authentication and data-access changes in the same release. | Separate low-risk deployment configuration from changes to identity and biometric access; gate both with their own tests. |

### Why these recommendations

The present browser path searches enrolled identities (a one-to-many task), so a wrong-person match can create a false attendance record. Rejecting an uncertain attempt with a clear retry is preferable to lowering the distance cutoff without evidence. **Recommended pilot gate: any observed wrong-person log stops rollout and triggers investigation; false rejects get a retry or supervised fallback.** Zero observed errors in a small pilot is not proof of a low population-wide error rate, so a quantitative target needs an adequately sized validation set. NIST distinguishes false matches from false non-matches and notes that poor image quality increases non-matches; threshold choice should be tested under the actual camera and lighting conditions ([NIST error tradeoffs](https://www.nist.gov/blogs/taking-measure/tale-two-errors-measuring-biometric-algorithms), [NIST face evaluation](https://pages.nist.gov/frvt/html/frvt11.html)). These sources guide the measurement approach; they do not validate this project's current model or supply a threshold for it.

Because production can be online, server-backed Expo matching avoids integrating a second on-device embedding runtime before the service is working. It also means captured biometric images cross the network, so the endpoint needs authenticated transport, strict retention/deletion, and performance tests. Existing browser descriptors cannot simply be assumed compatible with a different server model. A short scan session is appropriate for personal phones and prevents the current five-second no-face timer from ending a scan while a user is still trying. Expo recommends unmounting camera views when screens are unfocused ([Expo Camera documentation](https://docs.expo.dev/versions/latest/sdk/camera/)).

## Phase 0 — Agree on scope and success measures

**Inputs:** affected phone model and OS, browser and Expo app versions, network type, whether the PWA is installed, and an example of what “not working” means in each client (camera unavailable, no face box, unknown match, or attendance request failure). Both clients are in scope; offline production attendance is not required.

**Deliverable:** a short problem statement naming the client, reproducible steps, target devices, and measurable success criteria. Do not promise the proposed 5/10 second startup targets until the baseline is known.

**Gate:** we can reproduce the reported symptom and know which client and step fails.

## Phase 1 — Establish the production baseline

1. On the affected phone, record camera permission, actual stream width/height and frame rate, model load outcome, selected inference backend, employee fetch outcome, face box size, match distance, and attendance POST outcome. Record elapsed time for page load, model download, model initialization, camera readiness, and each inference stage. Do not retain raw face images or descriptors in ordinary logs.
2. Repeat cold and warm visits, normal browser and installed PWA if applicable, and a controlled local HTTPS run on the same phone. A localhost run on a different computer is not a valid device comparison.
3. Measure a small consented set of enrolled and unknown people under bright, dim, and backlit conditions. Keep no-face, false reject, and false accept counts separate. Include duplicate-name and multiple-face cases.
4. Compare response status and timings with the production Nginx/backend logs. Keep server checks read-only during diagnosis.

For Expo, record capture size, app startup, configured API URL, request/response status, and whether the current mock path is reached. Browser-only WebGL and face-api timing fields do not apply to the current Expo prototype.

**Deliverable:** baseline table and a ranked explanation of the failures: download/startup, camera, detection, embedding/match, attendance API, or PWA update.

**Gate:** the top failure mode is supported by traces rather than an assumed camera-resolution cause.

## Phase 2 — Correct identity and safety faults

This phase precedes any wider rollout or threshold relaxation.

| Work item | Reviewable result | Acceptance |
| --- | --- | --- |
| Expo mock match | Recognition unavailable state until a real matcher exists | Arbitrary/no-face photos cannot create attendance |
| Browser stable identity | Matcher returns a numeric employee ID; name stays display-only | Two employees with the same name log to distinct IDs |
| Request integrity | Define device/session authorization and server-side audit boundaries | A client-supplied ID or shared browser key is not treated as proof of a face match |
| Failure states | Distinguish model, camera, cache, and API failures in UI | No “ready” or success state when a required stage failed |

**Gate:** unknown faces and missing models fail closed, and the same person is attributed consistently by ID.

## Phase 3 — Improve browser detection and low-end performance

Select changes from Phase 1 evidence. Start with capture guidance and actual-resolution reporting, then compare detector settings and a still-frame retry on the same test set. Add quality checks and multiple enrollment samples if the baseline shows that enrollment variability is a major source of false rejects. Change the five second face timeout if it interrupts active scanning. Keep thresholds unchanged until false-accept testing supports a replacement.

For speed, split kiosk and admin code, measure cold and warm transfer sizes, version and cache local models, and profile WebGL versus CPU on target phones. Use one nonoverlapping inference scheduler and pause it when the camera or page is inactive. Compare startup, scan latency, responsiveness, and accuracy after each change; a speed win that increases wrong-person matches fails the gate.

**Deliverable:** before/after device measurements, chosen detector settings and model version, and the reason each setting was selected.

**Gate:** agreed accuracy and latency targets are met on the target devices without increasing false accepts. Targets are set after Phase 1.

## Phase 4 — Make Expo functional for online production

Confirm the recommended server-backed recognition approach, including image handling and retention, before design. Define a model/version contract for enrollment and matching; evaluate whether existing browser descriptors can be used or employees must re-enroll. Implement real one-face detection, quality checks, an unknown-person result, and authenticated attendance recording. Complete real login, production HTTPS API configuration, and clear network-failure states. The existing offline cache and sync code can be removed from the production path or deferred, because production offline attendance is not required. Validate fresh install, failed network, reopen, known person, unknown person, and no-face cases on physical devices.

**Deliverable:** an end-to-end Expo test report with no-face, unknown, known, and network-failure cases, plus a clear decision on retiring or deferring the old offline sync path.

**Gate:** no placeholder login or mock matching remains in the attendance path; a network failure cannot be shown as successful attendance.

## Phase 5 — Production configuration and controlled release

Correct `FRONTEND_URL` in the Compose backend environment and verify CORS and Socket.IO from the production origin. Verify that database credentials match the existing volume user; do not assume a changed `.env` updates MySQL accounts. Check the deployed backend version and schema. Add a reviewed cache/update policy for `/models/`, hashed assets, and the service worker. Test cold install, warm reopen, and update of an installed PWA.

Before release, review exposed descriptor routes, chat authentication fallback, kiosk/device credentials, audit logs, and retention. Run a small pilot with consented test users. Compare pilot metrics to the baseline and keep a rollback procedure for code, model, and schema versions. Production attendance testing should use a designated test identity so real records are not polluted.

**Gate:** production phone behavior matches the accepted pilot results, and failed scans or uploads show a recoverable reason.

## Proposed order and dependencies

```text
Scope decision -> phone baseline -> choose browser fixes -> accuracy/performance pilot
       |                |
       |                +-> production config and cache validation
       |
       +-> Expo safety stop -> recognition architecture decision -> Expo build and pilot
```

The Expo safety stop is urgent because the current mock can assign a scan to the wrong employee. The browser and Expo workstreams can then proceed independently. Threshold changes, a new mobile model, and production rollout each require their own measured acceptance gate.

## Questions to settle before implementation

1. **Answered:** both the website/PWA and Expo app are affected. Which phone models, OS versions, browsers, and app versions reproduce each symptom?
2. **Answered:** production does not require offline attendance, and local operation works. Does “local” mean the same phone accessing a local server, or development on a different device?
3. **Recommendation:** prioritize avoiding wrong-person logs; uncertain matches should retry or use a supervised fallback. Agree on an acceptable measured false-accept rate and who signs off on the validation set before tuning thresholds.
4. **Answered:** employees can re-enroll with several guided captures. Decide whether the old descriptors need a migration period and who schedules re-enrollment.
5. **Recommendation:** use a designated consenting staff volunteer or dedicated test account, on the affected phone and network, with test attendance kept separate from payroll/reporting. The person operating the phone can share a sanitized Network/Console trace with status codes and timings, without face images or descriptor values. Who can coordinate this pilot?
6. **Recommendation:** each person starts a short scan session; the camera stays active during that session and releases on result, cancel, timeout, or app background. Is there also a fixed shared kiosk that must stay ready for walk-up scans?

No dates or effort estimates are assigned until these decisions and the device baseline are available.
