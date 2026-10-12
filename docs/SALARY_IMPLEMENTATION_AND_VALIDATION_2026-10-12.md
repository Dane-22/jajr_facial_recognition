# Salary implementation and validation

Implemented locally on 2026-10-12. No production deployment was performed.

## Operating workflow

1. Restart the backend after updating code; `pool.ready` runs additive salary migrations before serving requests. Deploy/build the matching frontend. Existing employee and attendance rows are retained.
2. Superadmin opens **Salary → Daily rate setup**, chooses the employee, PHP daily rate, and effective date. Configure rates for every relevant work date; missing rates are never defaulted to zero. Rates are immutable and a later effective date supersedes earlier rates. Backdated rates affecting finalized periods are refused.
3. Choose month and period: **1st-15th** or **16th-month end**. These are the initial attendance-cutoff defaults for the confirmed 15th/month-end paydays. If the organization pays a previous cutoff, that mapping needs a separate specification.
4. Calculate preview and inspect each employee's breakdown, rates, work times, lunch/grace credit, payable days, lateness, sites, manual provenance, and excluded early/after-hours time. CSV exports the complete period, independent of display search/pagination.
5. Resolve review exceptions. Missing IN/OUT must be corrected through the existing **Superadmin Manual Attendance** workflow; the salary calculation never invents a timestamp. Its existing 30-day manual-entry window remains in force.
6. Superadmin saves a draft, then finalizes once the complete period has ended in Manila time and all employees are ready. The backend compares input revisions again under locks. Recalculate/save if inputs changed. Only one saved run is allowed per semi-monthly period.
7. Admins and Superadmin can view and export saved payroll. Finalized runs store an immutable calculation/attendance/rate/policy snapshot; later attendance or rate edits do not alter it. Amendments and payment tracking are not implemented; a finalized period cannot be overwritten.

## Confirmed calculation rules

All dates/times use Asia/Manila (PHT), while database attendance remains UTC.

| Employee position | Work schedule | Unpaid lunch | Regular working time |
| --- | --- | --- | --- |
| Engineer | 07:00-16:00 | 12:00-13:00 | 8 hours |
| Other | 08:00-17:00 | 12:00-13:00 | 8 hours |

Position uses `users.role`, not the administrator access field `admins.position`. Engineer matching trims whitespace and ignores case, then compares exactly with `engineer`. Historical schedule assignments are stored separately and employee position changes take effect on the Manila date of the edit. Multiple edits on the same date leave the latest daily schedule.

Initial schedule history for existing employees uses their current role as a baseline. **Review historical position accuracy before using old attendance for payroll.** Legacy role variants such as Senior Engineer do not automatically match Engineer. Historical schedule correction has no dedicated UI in this release.

For normal partial attendance, excluding actual lunch overlap:

```text
8 qualifying hours or more: daily rate
4 to under 8 qualifying hours: daily rate / 2
Under 4 qualifying hours: daily rate x qualifying seconds / 28800
```

Within the 15-minute grace period (through 07:15:00/08:15:00), credit first arrival as scheduled start and deduct nothing. Beyond grace, count all late minutes from scheduled start; do not subtract the grace allowance. Deduct PHP 1 per late minute.

Confirmed exception: late arrival followed by one continuous attendance interval through scheduled end earns full daily base pay minus lateness, despite fewer actual worked hours. Late arrival plus early departure instead uses actual eligible-hours thresholds minus lateness. Grace does not excuse early checkout. Early arrival and late departure do not increase regular pay or offset lost scheduled time.

At PHP 600/day:

| Engineer attendance | Base | Late deduction | Salary |
| --- | --- | --- | --- |
| 07:00-16:00 | 600 | 0 | 600 |
| 07:15-16:00 | 600 | 0 | 600 |
| 07:20-16:00 | 600 | 20 | 580 |
| 07:00-12:00 | 300 | 0 | 300 |
| 07:20-12:00 | 300 | 20 | 280 |
| 07:00-10:00 | 225 | 0 | 225 |

Rates use DECIMAL storage and integer cent/BigInt ratio calculations. Monetary results round to the nearest cent, half up, for each work day. Period totals sum those rounded day amounts. This rounding choice is documented here as an implementation default. Amounts show base attendance earnings, late deduction, and salary after lateness; other contributions/taxes/allowances are outside this implementation.

## Review exceptions and safeguards

- Missing IN/OUT, repeated/ambiguous events, nonpositive shifts, and missing rate/schedule data block finalization.
- Split shifts, overnight shifts, afternoon arrivals, fractional late minutes, and deduction exceeding earnings are flagged because their exact pay rules have not been approved. Their provisional amounts are diagnostic; do not treat them as payable finalized results.
- Fractional lateness examples: 07:20:01 is not silently rounded to 20 or 21 minutes. It requires a rounding decision. The grace cutoff uses exact seconds; arrivals later than 07:15:00/08:15:00 exceed grace.
- Archives preserve relevant employee history and calculated earnings. Employees with identical names are kept separate by numeric IDs.
- Draft save and finalization recheck current database permissions and input hashes. Employee locks coordinate with attendance/rate writes. Unique periods prevent duplicate runs. Finalized export reads stored evidence, never live recalculation.
- Rate setup/finalization are Superadmin-only implementation defaults. Admins can view, calculate, and export. Kiosk/employee tokens cannot access salary routes. Salary data is not added to shared attendance sockets or Google Sheets webhooks.
- Preview may show a subtotal alongside exceptions; all displayed amounts remain provisional until the period is complete and finalized. Attendance events mark affected previews stale, and the server also detects changes before save/export/finalization.

## Dashboard charts

**Early-arrival and after-hours attendance** shows unpaid minutes by work date and employee, with semi-monthly filters, a selected-employee comparison, and an accessible table. Valid paired attendance supplies the intervals; gaps and grace credit do not inflate actual attendance. Incomplete/invalid shifts are excluded with a visible count. These charts do not classify time as approved overtime or expose salary amounts. Charts refresh on new attendance events.

## Implementation map

- `backend/utils/salaryMigration.js`: rates, effective schedule history, saved payroll.
- `backend/services/salaryCalculation.js`: pure pairing and pay calculation, immutable policy description.
- `backend/services/salaryRepository.js`: complete period/context query, current permissions, revisions, audit helper.
- `backend/controllers/salaryController.js`, `routes/salaryRoutes.js`: previews, rates, drafts/finalization/history, CSV export, timing aggregates.
- `frontend/src/components/SalaryPage.jsx`: admin view, rate setup, period totals, responsive employee breakdown and payroll history.
- `frontend/src/components/AttendanceTimingCharts.jsx`: dashboard unpaid-attendance charts/table.
- Employee create/update flows maintain effective schedule history; correction navigation carries the employee ID to Manual Attendance.

Snapshot storage uses one immutable JSON document per saved payroll rather than separate item/evidence tables. The snapshot contains employee/day details, event IDs and timestamps, manual provenance, site transfers, rate IDs/amounts, schedule IDs, policy values, and summary amounts. This keeps saved exports and evidence consistent without rebuilding past runs.

## Validation

Final results: **50 backend tests passed, 21 frontend tests passed, 4 browser scenarios passed**, local MySQL smoke checks passed with fixture rollback, and the production frontend build passed.

- Backend tests cover confirmed pay examples, boundaries, rate/schedule history, current roles, stale drafts, finalization rejection, immutable exports, and repeatable migrations.
- Frontend tests cover role-specific controls, rate setup, cutoff dates, outdated responses, and attendance-triggered stale previews.
- Browser tests use API fixtures to verify desktop and 390/320px layouts, salary detail amounts, Admin read controls, and chart/table data. These are UI checks, not live financial-data verification.
- A separate loopback-only MySQL check inserts isolated fixtures in a transaction, verifies rates/schedules and PHP 580/PHP 280 amounts, verifies 1,002 events are not truncated, and rolls back all fixture rows.
- Production Vite build is checked. Its existing large-admin-bundle warning remains; no production deployment or physical-device attendance test is implied.

Commands from the respective directories:

```powershell
# backend/
npm test
node scripts/salarySmoke.js

# frontend/
npm test
npm run build

# repository root (installed Edge on Windows)
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/salary.playwright.config.js
```

Omit `PLAYWRIGHT_CHANNEL` to use Playwright's installed Chromium. Browser fixture screenshots are generated under `test-results/salary/` and are ignored by Git.
