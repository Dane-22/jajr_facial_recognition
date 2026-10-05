# Admin dashboard implementation and verification plan

This plan follows [the 2026-10-01 review](ADMIN_DASHBOARD_REVIEW_2026-10-01.md). A signed-in Chrome pass verified rendering and selected read-only interactions across the admin sections. Completion still requires independent data reconciliation, export checks, role checks, and mutation tests in staging. Every section needs a defined data contract and automated checks for its important calculations.

## Local implementation status (2026-10-01)

The local workspace now includes the daily Days Present field, a seven-day weekly default, valid monthly boundaries, zero-filled dashboard trends, person-level dashboard breakdown and employee comparison, a dashboard refetch on live attendance, inclusive Audit Logs end dates, and a latest-filter debounce. Employee deletion is rejected when attendance history exists. Settings writes validate known keys and geofence ranges; enabled geofencing rejects invalid runtime configuration. Maintenance uses an authenticated health endpoint and scoped cache purge, while unsupported Recognition and Shift Rules controls are labeled as stored preferences. CSV escaping was added to Daily Logs and Audit Logs, with the Audit Logs button labeled as a current-page export. These changes have **not** been deployed.

Still open: a verified Asia/Manila timestamp migration, employee deactivation/archival rather than delete rejection, server-side Attendance Audit pagination and full export, full filtered Audit Logs export, staging mutation and role tests, independent production data reconciliation, and release verification.


## Phase 0 — Establish trustworthy baseline and protect history

1. Preserve the signed-in Chrome observations in the review, then obtain read-only database query access or a sanitized reconciliation extract for independent count checks. Capture the deployed build hash, API response status, selected filters, and browser timezone for each section. Do not copy credentials or biometric payloads into reports.
2. Take a tested database backup and record the current schema, especially the `attendance_logs.user_id` foreign key. Define an archive/deactivate path for employees before testing any deletion. Acceptance: disabling an employee leaves all historical attendance and reports unchanged; delete is unavailable or explicitly guarded until preservation is implemented.
3. Build a small staging fixture: at least three employees, two admins with different roles, repeated IN/OUT events, an empty day, a local-midnight event, more than 1,000 attendance rows, and audit entries on both ends of a date range. Keep production tests read-only.

## Phase 1 — Make counts and dates correct

1. Define the business timezone (proposed: `Asia/Manila`) and document storage and API timestamp formats. Replace mixed UTC/browser/MySQL date derivation with one shared date contract. Use inclusive start and exclusive next-day boundaries for SQL. Acceptance: all eight sections and exports agree for events immediately before and after midnight; browser timezone changes do not change the business date's membership.
2. Separate dashboard event counts from employee current state. Calculate checked-in people from each employee's latest qualifying event, and keep total IN/OUT events in cards labeled as events. Acceptance: donut slices are nonnegative and sum to employee count for repeated scans; independent SQL agrees with displayed numbers.
   Fill every date in the selected trend range, including zero-activity days. Acceptance: a seven-day selection has seven dated points and does not draw a line directly across missing dates.
3. Reconcile socket updates by refetching the affected summary or updating every dependent view from one event model. Acceptance: a new attendance event yields the same values before and after page refresh, including a previously empty day.
4. Fix Audit Logs end-date filtering in both rows and summary. Acceptance: an event at 23:59 on the selected end date is included; an event at 00:00 the following day is excluded.
   Replace the fetch throttle that drops rapid filter changes with a debounce or request cancellation that always runs the latest filter set. Acceptance: rapidly changing start/end dates and action filters leaves rows, total, and visible controls in agreement.
5. Correct Reports' daily Days Present field and verify first/last timestamps. Acceptance: table, PDF, and Excel use the same labeled metrics and agree with raw attendance for daily, weekly, and monthly fixtures.
   Make the default Weekly Range seven inclusive calendar dates or label it as a custom eight-day range. Acceptance: the displayed range length matches its label and every included day's records are counted once.

## Phase 2 — Make every page complete and honest

1. Add server-side filtering, total count, and pagination to Attendance Audit. Make export use the full filtered data set, or label and limit it explicitly. Acceptance: a date older than the newest 1,000 records remains discoverable; page count and CSV row count match the API.
2. Specify each Settings control's intended runtime behavior. Implement the settings that are supported, hide or label those that are not, and add strict server-side validation for geofence coordinates/radius and other numeric fields. Acceptance: saving and reloading each control changes the intended behavior in staging; invalid enabled geofence settings are rejected rather than silently bypassed.
3. Make Daily Logs and Audit Logs CSV standards-compliant, and state whether exports include the page or all filtered rows. Acceptance: names containing commas, quotes, and newlines round-trip in a spreadsheet; export counts agree with filters.
4. Return an error when maintenance actions fail. Scope cache clearing to the intended application keys. Acceptance: a simulated Redis failure displays an error, not success; unrelated Redis keys remain intact.
   Replace the static green database, Redis, and Socket.IO status tiles with results from protected health checks, including checked-at time and unknown/error states. Acceptance: disconnecting each dependency in staging changes only its own status and never leaves a false green indicator. Remove the misplaced “Save Shift Rules” button from Maintenance.
5. Check Employee Directory search/sort/pagination and Admin Management role gating with staging mutations. Acceptance: UI and API reject unauthorized changes, and list contents match database rows after authorized changes.

## Phase 3 — Verification and rollout

1. Add focused tests for controller calculations, timezone boundaries, geofence validation, audit pagination/end dates, export contents, role checks, and employee archival. Keep tests based on independent expected results rather than implementation snapshots.
2. Run frontend lint, frontend tests, backend tests, and production build. Compare the built asset hashes with deployed assets after release. The current baseline is 5 passing frontend tests, 7 passing backend tests, and a passing build; admin section behavior has little automated coverage.
3. Deploy to staging and execute every row of the review checklist at desktop and mobile widths. Record pass/fail, evidence, and unresolved differences. Promote only after the data reconciliation and preservation checks pass.
4. Deploy production with a database backup and rollback instructions. Perform read-only smoke checks for authenticated data endpoints, chart totals, reports, exports, settings readback, and browser console errors. Do not run attendance or admin mutations as smoke tests against real employees.

## Definition of done

- Every admin section and Settings panel has a recorded live result or a clearly identified access blocker.
- Counts, dates, filters, pagination, and exports reconcile with independent queries over the same fixture.
- Employee lifecycle operations preserve historical attendance.
- Settings shown as operational have tested runtime effects; invalid configuration fails safely.
- Maintenance status reflects measured dependency state, and maintenance failures are visible to the admin.
- Automated tests, lint, and build pass, and the deployed asset version is recorded.
