# Attendance-based employee salary page

Date: 2026-10-12

Status: Salary implementation completed in the working tree, with local database, unit, UI, and browser verification. Production deployment has not been performed. Operating rules, implementation choices, and review exceptions are documented in [Salary implementation and validation](docs/SALARY_IMPLEMENTATION_AND_VALIDATION_2026-10-12.md).

Previous plan preserved: [Face scanning and production reliability](docs/FACE_SCANNING_PRODUCTION_RELIABILITY_PLAN_ARCHIVED_2026-10-12.md).

## 1. Objective and scope

Add a **Salary** page to the web Admin Portal. For a selected pay period, calculate each employee's attendance earnings using their own rate and the approved attendance policy. Show the attendance evidence behind each amount and identify missing rates or records requiring correction.

Confirmed requirement: **salary = daily rate x payable days**, as selected by the user. Each employee has an individual daily rate. At least 8 payable hours earns full-day pay; 4 to under 8 earns half-day pay; under 4 earns `(daily rate / 8) x payable hours`. Arrival within the 15-minute grace period receives scheduled-start credit. The user confirmed both the thresholds and grace credit.

Confirmed exception to actual-hour thresholds: late arrival followed by continuous attendance through scheduled end earns full daily base pay minus the late deduction, rather than half-day pay solely because of lateness. Keep actual worked hours separate from base-pay qualification; early departure and other gaps still require the attendance threshold rules.

Confirmed schedules, in Asia/Manila time:

| Employee position | Scheduled work | Unpaid lunch | Working time excluding lunch |
| --- | --- | --- | --- |
| Engineer | 07:00-16:00 | 12:00-13:00 | 8 hours (480 minutes) |
| All other positions | 08:00-17:00 | 12:00-13:00 | 8 hours (480 minutes) |

Confirmed arrival grace: 15 minutes after scheduled start, through 07:15 for Engineers and 08:15 for other employees. Arrival within grace is credited as arrival at the scheduled start for salary calculation, with no late deduction. Once grace is exceeded, deduct PHP 1 per late minute counted from the scheduled start, not the end of grace. Engineer arrival at 07:20 incurs PHP 20; other-position arrival at 08:20 also incurs PHP 20. Preserve actual timestamps and show grace separately. Proposed precise cutoff: 07:15:00 / 08:15:00; fractional-minute rounding remains pending. Full-day base pay is confirmed for late arrival followed by attendance through scheduled end; outside-schedule time is excluded from pay.

The project stores employee position in `users.role`; `admins.position` instead describes administrator access. Proposed matching: trim and case-normalize the employee role and compare exactly with `engineer`. Inspect existing role values for variants such as Senior Engineer before rollout rather than silently assigning them to a schedule.

Confirmed release scope: rate setup, calculation preview, employee/day breakdown, attendance correction links, CSV export, and saved finalized payroll records. Payroll is in PHP, paid every 15th and last calendar day of the month. Proposed attendance periods are 1st-15th and 16th-month end, inclusive; confirm whether payday instead uses an earlier attendance cutoff. Admins and Superadmin can view salaries. Proposed write permissions reserve rate/policy edits, draft saving, and finalization for Superadmin. Late deduction is PHP 1 per minute from scheduled start when grace is exceeded; full-day base pay is retained when late arrival is followed by attendance through scheduled end.

Early arrival and late departure are excluded from regular pay and cannot offset lost scheduled time. Show those attendance durations in dashboard charts, without treating them as payable overtime. Missing IN or OUT requires Superadmin correction before finalization. Display base attendance earnings, additional late deduction, and salary after late deduction separately; do not label this statutory net pay while other deductions/pay components remain unspecified.

## 2. Project review findings

Reviewed repository structure, application entry points, employee/attendance flows, reports, settings, database schema and migrations, authentication, mobile integration, exports, deployment, and test setup. This is a source review for feature planning, not a completed security audit or validation of production attendance. Historical SQL dumps and documentation do not establish the current live schema.

| Area and source | Current behavior | Salary integration |
| --- | --- | --- |
| `frontend/src/App.jsx`, `components/AdminLayout.jsx` | React/Vite/Tailwind admin portal at `/admin/dashboard`; screens selected with `activeTab`. | Add a `salary` sidebar item and content branch. A separate URL would require routing changes. |
| Employee Directory, Daily Logs, Attendance Audit, Reports, Manual Attendance, Settings | Existing employee and attendance administration. | Reuse the shell, filters, UI patterns, and correction workflow. |
| `backend/controllers/employeeController.js` | `users` holds numeric ID, name, role, active/archive status. Directory queries cap results at 1,000. | Use employee IDs and separate rate storage. Do not calculate payroll from the capped directory response. |
| `attendanceController.js`, `services/faceRecognition.js` | Accepted attendance is stored as individual `IN`/`OUT` events with timestamps, coordinates, and sites; scans check site/session rules. | Calculate from server records, never client recognition state or scan counts. |
| `utils/siteMigration.js`, `utils/siteRules.js` | Assigned sites and `employee_site_sessions` track current open shifts. | Use sessions to diagnose open attendance; historical events remain the calculation source. |
| `services/manualAttendance.js`, `utils/manualAttendanceMigration.js` | Manual attendance creates actual logs, actor/reason metadata, and audit entries. Site transfers preserve one ongoing shift. | Include valid manual attendance with provenance. Transfers cannot produce extra payable days/shifts. |
| `controllers/reportController.js` | Reports count distinct Manila dates with `IN`; first/last timestamps are aggregates. | Presence counts do not establish payable hours or full days. Build a dedicated calculation service. |
| `attendanceController.js` | `/api/attendance/all` returns only 1,000 events. | Query the complete payroll period directly; never silently truncate input. |
| `backend/config/db.js`, `frontend/src/utils/attendanceTime.js` | MySQL/mysql2 use UTC; attendance displays use Asia/Manila. Startup migrations expose `pool.ready`. | Convert Manila period boundaries to UTC and await schema readiness. Check legacy timestamps before rollout. |
| `Settings.jsx`, `utils/settingsValidation.js`, `adminController.js` | Work start/end and grace settings exist; defaults are 09:00, 17:00, 15 minutes. Assistant lateness uses a separate hard-coded comparison. | Settings are not a complete payroll policy; do not reuse assistant late counts for deductions. Version rules used for salary. |
| `middleware/authMiddleware.js`, `requireSuperadmin.js` | Admin JWT authentication and database-backed Superadmin position checks. | Admin/Superadmin salary viewing confirmed; proposed exports for both and edits/finalization for Superadmin. Enforce per-operation permissions server-side. |
| `services/employeeArchive.js` | Archive preserves history; physical deletion is refused. | Archived employees with period attendance remain reportable. Earned amounts cannot disappear upon archive. |
| `mobile/` | Expo login/dashboard/camera uses server recognition. Legacy offline sync code remains, but backend batch sync is disabled. | Accepted server attendance feeds salary. Initial salary UI belongs in the web portal. |
| `react-native-movie-app/` | Separate movie application. | No salary integration is evident. |
| `AttendanceReports.jsx`, `components/UI/`, `utils/csv.js` | PDF/XLSX exports, responsive cards/tables, CSV formula escaping. | Reuse UI components and start with CSV; payslips/PDF can follow. |
| Backend/server, Compose, sync services | Express/MySQL, Redis/cache, Socket.IO, Google Sheets attendance sync, Docker/Nginx. | MySQL is authoritative. Keep salary out of kiosk responses, generic employee data, attendance webhooks, chat, and shared socket payloads. |
| Backend/frontend tests, root Playwright config | Node tests, Vitest/Testing Library, API/E2E suites. Playwright defaults to localhost:3000. | Add focused calculation/API/UI tests; verify actual local frontend/API ports before browser tests. |

No salary/payroll implementation or employee daily/hourly rate fields were found in the reviewed application sources. A complete schedule, paid-leave, holiday, and approved-overtime model is also absent.

## 3. Rules to confirm before implementation

These questions do not block this planning document; their answers define the calculation.

| Decision | Question / proposed starting point |
| --- | --- |
| Pay basis (confirmed) | Daily rate x payable days. Hourly wages and monthly salary adjustment are outside the current scope. |
| Rates/currency (confirmed) | PHP. Each employee needs a daily rate and effective date; missing rates are errors, not zero. |
| Payday (confirmed) / attendance cutoff (proposed) | Every 15th and last calendar day. Proposed inclusive periods: 1st-15th and 16th-month end; confirm if a different attendance cutoff precedes payday. |
| Work schedules (confirmed) | Engineer: 07:00-16:00. Other positions: 08:00-17:00. Both exclude 12:00-13:00 lunch and have 8 working hours. |
| Day thresholds (confirmed) | At least 8 payable hours: full day. From 4 to under 8: half day. Under 4: prorated pay. Missing IN/OUT requires Superadmin correction before finalization. |
| Partial attendance (confirmed model) | Full day earns daily rate; half day earns daily rate / 2; under 4 hours earns (daily rate / 8) x payable hours. |
| Lunch (confirmed) / split shifts (pending) | Exclude actual overlap with 12:00-13:00. Can several shifts occur in one day? Do not subtract a fixed hour from attendance that does not cover lunch. |
| Outside scheduled hours (confirmed) | Exclude early arrival/late departure from payable time. Display their durations in dashboard charts; do not pay overtime in this scope. |
| Arrival grace (confirmed) | 15 minutes: Engineer through 07:15; other positions through 08:15. Within-grace arrival receives scheduled-start credit for pay. |
| Additional late deduction (confirmed) | Within grace: zero deduction. Beyond grace: PHP 1 per minute from scheduled start (07:20 means 20 minutes, not 5). Applies only to lateness, not early departure. Late arrival followed by attendance through scheduled end retains full daily base pay minus deduction. |
| Overnight shifts | Attribute daily credit to shift start date or split at midnight? Define how a shift crossing a payroll cutoff contributes payable days. |
| Missing events (confirmed) | Block finalization until Superadmin corrects missing IN/OUT through the existing attendance workflow; never invent timestamps. |
| Extra pay | Out-of-schedule attendance is charted but unpaid. Holiday/rest-day/paid-leave treatment still needs supporting rules/data if required. |
| Other amounts | Are allowances, advances, contributions, taxes, or other deductions in scope? Exclude them from the initial attendance-only total unless specified. |
| Viewing (confirmed) / writes (proposed) | Admins and Superadmin can view salaries. Proposed: both can preview/export; only Superadmin changes rates/policy, saves drafts, and finalizes. |
| Saved results (confirmed) | Preview, export, and saved finalized payroll are all in scope. Payslips and payment tracking remain separate optional features. |

This document defines application design, not statutory payroll formulas. Required statutory calculations need a separately verified specification before implementation.

## 4. Calculation design

Create a deterministic backend `salaryCalculation.js` service with attendance, rate history, period, and versioned policy inputs. The browser displays results; it never supplies authoritative amounts.

1. Validate real calendar dates, range order, and a maximum preview range. Convert inclusive Manila dates to a UTC interval: `[start at 00:00 PHT, day after end at 00:00 PHT)`.
2. Include relevant employees, including archived employees with period attendance and active employees with no records. Do not infer scheduled absences without a calendar and employment dates.
3. Fetch events ordered by employee, timestamp, and ID, including enough context before/after the period to pair crossing shifts. Query the entire bounded period without a silent record cap; paginate display separately.
4. Pair IN with OUT. Flag repeated IN, orphan OUT, overlaps, ambiguous equal-time events, nonpositive duration, implausibly long shifts, missing site history, and open shifts. Do not guess which conflicting event to pay.
5. Include valid scanner/manual attendance and preserve log IDs, source, reason, and actor. Transfers change site attribution within a shift; they do not add worked time.
6. Convert attendance into payable day credit using the confirmed thresholds and late-to-scheduled-end exception. Multiple shifts cannot earn duplicate daily credit; exclude gaps when assessing worked duration. Preserve actual hours separately from qualification credit. Hours support day qualification, not an hourly wage calculation.
7. Resolve the effective rate/policy for the work date, including changes within a period. Missing or overlapping rate ranges produce review errors.
8. Return payable units, rate segments, day/shift breakdown, amounts, exception details, calculation version, and source revision. A subtotal of valid records for an employee with errors remains visibly provisional and cannot finalize.

Schedule and lunch handling:

- Resolve the employee's work-date schedule: Engineer morning 07:00-12:00 and afternoon 13:00-16:00; other positions morning 08:00-12:00 and afternoon 13:00-17:00.
- Exclude only the attendance overlap with the local lunch interval [12:00, 13:00). A record ending at noon or beginning at 13:00 loses no additional time; 11:30-12:30 contains 30 working minutes, not zero.
- Count each covered interval once across split shifts. Intersect attendance with morning/afternoon windows for payable time. Keep attendance before start and after end separately for charts; neither increases day credit or offsets lateness/early departure.
- Keep actual worked minutes, confirmed grace credit, and payable-day credit separate. Apply 8-hour full-day and 4-hour half-day thresholds; under 4 hours use the daily-rate-derived hourly formula. For a within-grace first arrival, credit only the gap from scheduled start to that arrival, once per work date. Grace does not excuse early departure or other attendance gaps.
- Persist effective-dated employee schedule assignments/history and snapshot the applied role/schedule with saved payroll. A later position change must not retroactively shift an employee's historical work schedule. Existing `users.role` has no effective-date history, so initial historical assignments require review.

Confirmed daily formula:

```text
attendance earnings = sum(daily rate effective on work date x payable day credit)
```

At an illustrative PHP 600/day, 10 full credited days yield PHP 6,000; 9 full days plus one half day yield PHP 5,700 before additional late deduction. Missing time-out blocks finalization until Superadmin correction.

For a constant daily rate across the period, this simplifies to `daily rate x total payable days`. If the daily rate changes within the period, calculate each work date using its effective rate, then sum the results. Do not introduce hourly pay or a monthly salary divisor.

Confirmed threshold pay model for each work date, where H is qualifying hours after lunch exclusion and confirmed arrival-grace credit. Apply the confirmed late-to-scheduled-end exception first: full-day base earnings, then late deduction. Do not run that case through a second actual-hour threshold reduction.

```text
H >= 8:      earnings = daily rate;          payable day credit = 1
4 <= H < 8:  earnings = daily rate / 2;      payable day credit = 0.5
0 <= H < 4:  earnings = (daily rate / 8) x H; payable day credit = H / 8
```

Store the confirmed thresholds as 480 and 240 minutes in the versioned policy. The below-half-day hourly equivalent is derived from the daily rate, not a separate employee hourly rate. Calculate partial hours from precise seconds (`earnings = daily rate x payable seconds / 28800`), then apply the approved monetary rounding rule.

At an illustrative daily rate 600, 3 qualifying hours earns 225, 4 earns 300, 7 hours 59 minutes earns 300, and 8 earns 600 before any late deduction. These thresholds apply to early departure and other partial attendance, subject to the confirmed full-day exception for late arrival followed by attendance through scheduled end.

Grace examples: Engineer attendance 07:15-16:00 and other-position attendance 08:15-17:00 each receive 8 payable hours after lunch exclusion and scheduled-start credit, earning full-day pay. Engineer 07:15-15:00 receives 7 payable hours and earns half-day pay. These examples isolate confirmed grace/threshold rules without assuming overtime or after-grace deductions.

Store rates as MySQL `DECIMAL`; use decimal arithmetic or scaled integers/rational units rather than ordinary JavaScript floating-point money calculations. Return money as decimal strings. Specify rounding mode/stage, retain seconds until conversion, and reconcile row amounts with summary totals.

Additional late deduction:

```text
salary after late deduction = base attendance earnings - additional late deduction
```

Confirmed deduction rate: **PHP 1 per late minute**. This deduction applies only to lateness, not early departure or other lost attendance time. No deduction applies to arrival within the confirmed grace period. Early departure still affects the agreed full-day/half-day/prorated attendance calculation; it does not receive a separate PHP 1/minute deduction.

Confirmed interaction: late arrival followed by attendance through scheduled end retains full daily base pay minus late deduction. Do not also reduce this case to half-day pay solely because of lateness. For late arrival combined with early departure, apply the actual eligible-hours full-day/half-day/prorated thresholds and then subtract the late deduction; the user confirmed Engineer 07:20-12:00 earns half-day pay minus PHP 20. Preserve actual duration independently from base-pay qualification. Interruptions/split shifts and extreme afternoon arrivals still need specification.

For Engineer 07:20-16:00 at PHP 600/day, actual scheduled work excluding lunch is 7 hours 40 minutes. Full-day base pay is PHP 600, late deduction is PHP 20, and confirmed resulting pay is PHP 580. Other-position attendance 08:20-17:00 produces the same result at that daily rate.

Still confirm fractional-minute rounding, interruptions/split shifts, extreme arrivals, and handling of deduction exceeding daily earnings. Preserve all terms in the breakdown and payroll snapshot. Finalization cannot use an unresolved policy for affected cases.

### Confirmed late-pay rule and remaining edge cases

Confirmed late-minute rule (overrides the earlier recommendation): if actual first arrival is within grace, deductible late minutes = 0; otherwise deductible late minutes = actual first arrival minus scheduled start, expressed in minutes. Do not subtract the 15-minute grace allowance once its cutoff is exceeded. Late deduction = PHP 1 x deductible late minutes, with fractional-minute rounding still to confirm.

Use lateness deduction as the monetary consequence of late arrival when the employee stays through scheduled end; do not also reduce that day to half-day pay solely because of lateness. Record full-day base credit for that confirmed case while preserving actual hours. Missing attendance cannot use the exception; Superadmin must correct it first. Do not silently extend this exception to interrupted days or very late/afternoon arrivals without defining those cases.

The user explicitly approved the full-day-minus-lateness adjustment after confirming that late minutes count from scheduled start. This revises the earlier strict actual-hours threshold for the confirmed late-to-end case. It does not pay out-of-schedule time or classify it as overtime. Define very late/afternoon arrivals, split shifts, fractional-minute rounding, and a nonnegative-pay floor before implementing those edge cases; recommended extreme-case handling is a visible review exception.

Examples at PHP 600/day:

| Engineer attendance | Actual scheduled work excluding lunch | Base qualification | Late deduction | Salary / status |
| --- | --- | --- | --- | --- |
| 07:15-16:00 | 7h 45m | 8h (confirmed grace credit) | PHP 0 | PHP 600 |
| 07:20-16:00 | 7h 40m | Full day (confirmed late-to-end exception) | PHP 20 | PHP 580 (confirmed) |
| 07:00-12:00 | 5h | 5h | PHP 0 | PHP 300 |
| 07:20-12:00 | 4h 40m | Half day (confirmed threshold plus lateness) | PHP 20 | PHP 280 (confirmed) |

Policy storage, UI, exports, and tests must distinguish actual work, grace credit, the confirmed late-to-end full-day exception, base earnings, and late deduction. Do not alter actual attendance timestamps to implement qualification credit.

## 5. Proposed data model

Use additive, repeatable migrations. Never reimport destructive historical SQL dumps into an existing database.

| Table | Purpose |
| --- | --- |
| `employee_salary_rates` | Employee ID, `daily_rate DECIMAL`, currency, effective-from/to dates, creator/time. Define half-open ranges; reject overlaps transactionally. Never rewrite rates referenced by finalized payroll. |
| `salary_policies` | Immutable version/effective dates, schedules/lunch, 480/240-minute thresholds, 15-minute grace, PHP 1/minute lateness counted from scheduled start beyond grace, late-to-end full-day exception, and rounding rules. Implement only supported/approved rules. |
| `employee_salary_schedules` | Effective-dated employee schedule assignment and position snapshot: Engineer 07:00-16:00 or other 08:00-17:00, lunch 12:00-13:00, 480 regular minutes. Preserve history when the employee's role changes. |
| `payroll_runs` (saved phase) | Period/currency, DRAFT/FINALIZED status, policy/calculation versions, source hash/revision, creator/finalizer/time. Payment state is separate if later requested. |
| `payroll_run_items` (saved phase) | Employee ID/name snapshot, rate segments, payable units, base earnings, late minutes/deduction, salary after late deduction, exceptions, and totals. |
| `payroll_run_attendance` (saved phase) | Immutable event/transfer IDs and timestamp/source snapshots, pairing decisions, work date, credited units, rate/policy evidence. |

Validate positive daily rates, supported currency, scale/range, real dates, and employee IDs. Do not seed guessed salaries. Check existing `(user_id, timestamp)` indexes before adding indexes. Await `pool.ready`; failed salary migration must disable salary operations on incomplete schema.

## 6. Backend APIs and safeguards

Add `routes/salaryRoutes.js`, `controllers/salaryController.js`, calculation/rate services, and a migration; mount `/api/salary` in `backend/server.js`.

| Proposed endpoint | Purpose |
| --- | --- |
| `GET /api/salary/rates?employeeId=...` | Authorized rate history. |
| `POST /api/salary/rates` | Effective-dated rate creation and audit entry. |
| `POST /api/salary/preview` | Calculate a validated period/filter scope; return summary, paginated rows, exceptions, preview ID/revision. |
| `GET /api/salary/previews/:id/employees/:employeeId` | Breakdown from the same calculation revision. |
| `GET /api/salary/previews/:id/export` | Complete scoped CSV from that revision, not just the visible page. |
| `POST /api/salary/runs` | Save a consistent draft using an idempotency key; proposed Superadmin only. |
| `POST /api/salary/runs/:id/finalize` | Check source revision and exceptions under transaction/locking, then finalize; proposed Superadmin only. |
| `GET /api/salary/runs` | Paginated payroll history for Admin/Superadmin. |
| `GET /api/salary/runs/:id` | Historical immutable result and evidence for Admin/Superadmin. |
| `GET /api/salary/runs/:id/export` | Export the saved finalized result rather than recalculate it. |
| `GET /api/dashboard/attendance-timing` | Period-scoped early-arrival/late-departure chart aggregates and employee breakdown for authenticated Admin/Superadmin. |

Apply `verifyAdminToken` plus current database role validation to all salary reads, previews, exports, history, and charts; admit Admin and Superadmin. Proposed write rules add `requireSuperadmin` for rates/policy, saved drafts, and finalization, matching the existing correction authority. Recheck permissions inside sensitive transactions. Navigation hiding is insufficient. Keep rates out of general employee API responses.

Lock employee rate writes to prevent concurrent overlapping effective ranges. Define preview retention/expiry and how changed inputs mark it stale. Draft save/finalization must use a consistent source snapshot and detect new backdated attendance or rate/policy changes. Define permitted overlapping pay periods and enforce uniqueness/idempotency to avoid duplicate payable runs. Block finalization with unresolved errors.

After finalization, use an audited amendment/adjustment linked to the original; do not mutate its amounts. Audit rate changes, saved runs, finalization, and exports with actor/scope/reason and appropriate before/after data. Disable generic salary caching initially or scope it by authorization/revision. Never broadcast salary in `admin-room`.

## 7. Frontend page

Create `SalaryPage.jsx`, and rate/details components as needed. Add `nav-salary` and its render branch to `AdminLayout.jsx` under approved permissions.

- Header: Salary, selected period, preview/finalized state, calculation timestamp/revision, and stale-data notice.
- Filters: month and semi-monthly period presets (1st-15th, 16th-month end, pending cutoff confirmation), employee search, role, archive status, and exception status. Add site breakdown only after transfer allocation is defined; site filtering must not silently reduce total employee earnings.
- Cards: employees included, payable days, base attendance earnings, additional late deduction, salary after late deduction, and employees needing review. Totals describe the complete selected scope; provisional sums are labeled.
- Desktop table/mobile cards: employee ID/name/role, PHP daily rate, payable days, base earnings, late deduction, resulting salary, status, View breakdown, and authorized Manage rate.
- Details: daily/shift times in PHT, schedule, lunch excluded, actual worked minutes, grace credit, full-day late-to-end exception where used, payable day credit, late minutes/deduction, sites/transfers, manual provenance, rate, formula, outside-schedule time, and exceptions.
- Missing rate: Rate not configured with setup action. Separate No attendance from Needs correction; absent data must not appear as successful zero earnings.
- Correction link: navigate to existing Manual Attendance with employee/date context; extend navigation context if needed. Do not edit attendance from the salary calculator.
- CSV: full selected revision, with period/currency/rates/units/earnings/exceptions and Provisional labeling. Reuse `utils/csv.js` formula escaping. Saved final exports use stored snapshots.
- Payroll history: show saved periods, state, PHP totals, creator/finalizer/time, details, and snapshot export. Proposed Superadmin Save draft / Finalize actions are separate from Admin viewing/preview/export. Missing logs and unresolved policy/rates block finalization with correction links.
- States: loading, empty, invalid dates, denied/expired session, rate-limit/network error, and stale result. Cancel/discard outdated filter responses. Rate changes require recalculation or mark the preview stale.

Reuse `RecordCard`, `TableScroll`, `StatCard`, responsive admin shell, and existing error patterns. Attendance notifications may mark a calculation stale without sending salary data. PDF/payslips and employee mobile access are later scope decisions.

### Dashboard attendance charts (confirmed request)

Extend `DashboardCharts.jsx` using the existing Recharts library. Include a stacked bar chart of before-start and after-end attendance minutes by work date, an employee comparison chart, and period totals. Match payroll date/role/employee filters and use effective work-date schedules. Tooltips/drill-down show actual IN/OUT, schedule, excluded durations, and source; provide an accessible table alternative on mobile.

Derive durations from valid paired attendance, not presumed continuous presence between arbitrary first/last events. Exclude gaps; attribute midnight-spanning intervals consistently and flag ambiguous records. Open/unpaired logs cannot contribute invented after-end duration. Label charts **Early-arrival attendance** and **After-hours attendance (unpaid)**; these logs do not establish approved overtime work. Grace credit is not early arrival and must not inflate actual attendance charts. Dashboard chart totals must reconcile to excluded intervals in salary details and contain no unnecessary salary amounts.

## 8. Implementation phases

1. **Confirm policy and inspect data:** resolve Section 3, inspect live schema/indexes and anonymized attendance sequences, and agree on example amounts. Deliver an approved rule matrix.
2. **Rates/policies:** additive migration, protected APIs, effective-date validation, audit records, and rate form. Leave attendance capture intact.
3. **Calculation/preview:** deterministic pairing and daily-rate pay service, complete period query, review exceptions, revision-consistent details/export. Deliver reproducible evidence-backed amounts using daily rate x payable days.
4. **Salary screen and dashboard charts:** navigation, semi-monthly presets, PHP amounts, separate late deductions, details, setup/correction links, CSV, and responsive early-arrival/after-hours charts. Deliver a usable preview workflow.
5. **Saved payroll (required):** history, drafts, snapshots, concurrency checks, immutable finalization, finalized export, and amendments. Missing IN/OUT must be corrected by Superadmin before finalization.
6. **Validate/release:** run checks below on isolated test data, manually reconcile representative calculations, back up the database, then deploy approved migrations/backend/frontend together. Rollback disables salary routes/UI while retaining new records. This planning request does not authorize production deployment.

Expected integration files: `backend/server.js`, `backend/config/db.js`, new salary migration/routes/controllers/services, dashboard routes/controller, `frontend/src/components/AdminLayout.jsx`, `DashboardCharts.jsx`, new salary components and tests. General employee/scanner/mobile writes require no salary fields. Update `Documentation.md` after implementation with confirmed rules and operating steps.

## 9. Validation and acceptance

- Calculation: full/partial payable days, daily rate x credited days, no attendance, multiple shifts/gaps/breaks, repeated/unmatched events, manual pairs, invalid durations, overnight/cutoff/month boundaries, transfers, archives, duplicate names, missing/effective-dated daily rates, and rounding reconciliation.
- Schedule/lunch: Engineer 07:00-16:00 and other 08:00-17:00 each yield 480 working minutes; noon/13:00 boundaries, partial lunch overlap, morning-only/afternoon-only attendance, split shifts without double lunch subtraction, outside-schedule time under the approved rule, role normalization, and effective-dated position changes.
- Grace/thresholds/deductions: arrivals at start, exactly +15 minutes, and just after the cutoff for both schedules; grace credit versus actual time; threshold boundaries; partial hours; and the explicitly approved additional late-deduction formula/stacking rule with separate base/deduction/result totals.
- Confirmed late-to-end pay: Engineer 07:20-16:00 and other 08:20-17:00 at PHP 600/day both produce PHP 600 base minus PHP 20 deduction = PHP 580, despite actual 7h 40m work. Early departure uses thresholds; Engineer 07:20-12:00 produces PHP 300 half-day base minus PHP 20 = PHP 280. Unresolved interruptions/extreme cases remain visibly flagged.
- Cutoffs/charts: both semi-monthly periods, 28/29/30/31-day month ends, PHP formatting, exclusion of early/after-hours time from pay, chart reconciliation without gap/grace inflation, corrected/archived employees, and no invented durations for incomplete logs.
- Data/API: over 1,000 period events without truncation, UTC boundaries, date/range validation, concurrent rate overlaps, no guessed defaults, missing/expired JWT, employee/kiosk tokens, Admin/Superadmin reads, proposed Admin write restrictions, and current role revocation.
- Saved payroll: duplicate requests, overlapping runs, concurrent finalization, changed/backdated attendance during calculation, stale-rate/policy inputs, unresolved exceptions, and immutable history after amendments.
- UI/export: authorized navigation, filter races, rate-save failures, labels/errors, matching detail/summary, and complete revision-consistent CSV rather than visible-page-only export.
- Browser/regressions: desktop, 320/390/430px widths, short viewport, 200% zoom, keyboard/dialog focus, readable amounts, no page-wide overflow, and unchanged attendance/manual correction/archive/report behavior.
- Run backend `npm test`, frontend `npm test` and `npm run build`, then focused Playwright checks against verified local URLs using isolated fixtures. No application tests are needed for this documentation-only change.

Acceptance: agreed examples match the confirmed rules; every amount traces to attendance/rate/policy evidence; missing rates or ambiguous logs stay visible and cannot silently finalize; access covers reads/writes/exports; export totals reconcile with their revision; saved finalized results remain stable after later attendance, name, rate, or policy edits.
