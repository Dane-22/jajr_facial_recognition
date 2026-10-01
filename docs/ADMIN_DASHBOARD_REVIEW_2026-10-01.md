# Admin dashboard review — 2026-10-01

## Scope and evidence

The admin portal at `/admin/dashboard` is one React route with eight sidebar sections: Dashboard Charts, Employee Directory, Admin Management, Attendance Audit, Daily Logs, Audit Logs, Reports, and Settings. Settings contains Recognition, Shift Rules, Security, Maintenance, and Geolocation panels. This review maps every section to its API and checks the source paths that produce its displayed data.

Findings below describe the deployed build reviewed on October 1. Local fixes made afterward are tracked in [the implementation plan](ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md) and `worklog.md`; they are not live until deployed.

Evidence available on 2026-10-01:

- The live page served `index-D8nW1z94.js`, `utils-D7d4yU-I.js`, and `index-DB19k2x7.css`, matching a fresh local production build. A tokenless request to `/api/dashboard/stats?days=7` returned 401. This verifies deployed assets and the API authentication boundary, not authenticated page behavior.
- A user-provided screenshot of the signed-in Dashboard Charts page (2026-10-01 11:13 Asia/Manila) showed 9 employees, 2 check-ins today, 1 check-out today, and 3 total events. The screenshot confirms the page renders charts and cards; it does not independently reconcile those numbers with the database or exercise the other tabs.
- Seven further user-provided screenshots (2026-10-01 11:15 Asia/Manila) show every sidebar section rendering. Employee Directory and Reports each display 9 employees. Daily Logs and Reports each show 2 IN and 1 OUT events on October 1. Attendance Audit displays 184 total records and shows the same recent event IDs as Daily Logs; Audit Logs displays the corresponding actions. Four more screenshots (11:20) show the remaining Settings panels: Shift Rules, Security, Maintenance, and Geolocation. These are visual cross-checks, not independent database reconciliation or interaction tests.
- A signed-in Chrome tab became available later on October 1. Read-only navigation opened all eight sections. Switching the Dashboard trend from 7 to 14 days updated its title, but the chart still showed only September 29 and October 1; the 7-day choice was restored. Employee search for one known name narrowed 9 rows to 1. Attendance Audit’s Today shortcut narrowed 184 records to the 3 October 1 records. Daily Logs’ IN filter narrowed 3 events to the 2 IN events. Audit Logs pagination advanced from rows 1–10 to 11–20. Daily, weekly, and monthly Reports loaded; October monthly Days Present Sum was 1 while October 1 daily Days Present Sum remained 0. Maintenance still displayed its static health claims and misplaced Save Shift Rules button. The browser console reported no errors during this pass. These checks confirm selected live interactions, not the full data contract or mutation flows.
- Recent rows in Attendance Audit and Daily Logs render map frames. Those components render frames only when both latitude and longitude are present, so the screenshots support that these events saved location coordinates. Some map frames were blank at capture time; persistent map loading was not verified.
- `npm run lint` passed. The frontend suite passed 5 tests in 2 files; the backend suite passed 7 tests in 2 files. `npm run build` passed with a warning that the admin chunk is about 1.3 MB before gzip. These suites do not exercise most admin sections or reconcile displayed totals with database rows.
- No read-only production database query access was available for independent reconciliation. No production admin mutation was performed. Exports, save/delete actions, role restrictions, responsive layouts, and full production data accuracy remain open until the staging and read-only checklist is run.

## Section inventory and validation status

| Section | Main API / source | What it should show | Review status |
| --- | --- | --- | --- |
| Dashboard Charts | `/api/dashboard/stats`, `/api/dashboard/calendar`, `/api/attendance/daily`; `DashboardCharts.jsx`, `dashboardController.js` | Event totals, trend, employee comparison, current-state breakdown, calendar drilldown | Signed-in page opened with 9 employees and 3 events; 14-day selector worked but trend still omitted zero-activity dates; reconciliation and calendar interaction pending |
| Employee Directory | `/api/employees`; `EmployeeList.jsx`, `employeeController.js` | Search, sort, enrollment, editing, deletion | Live search narrowed 9 employees to 1 and reset restored 9; sort, paging, and mutations pending; deletion can affect history |
| Admin Management | `/api/admin/all`, `/create`, `/:id`; `AdminManagement.jsx`, `adminController.js` | Admin list and role-gated management | Initial list screenshot reviewed: 2 superadmin rows; role and mutation checks pending |
| Attendance Audit | `/api/attendance/all`, `/api/users`; `AttendanceAudit.jsx`, `attendanceController.js` | Calendar, filtered history, CSV | Today shortcut returned 3 of 184 records and matched Daily Logs; older-than-1,000 case and export pending |
| Daily Logs | `/api/attendance/daily`, `/api/employees`; `DailyLogs.jsx` | Date/employee/status filters, sort, CSV, live updates | Live IN filter returned the 2 matching records; other dates, live update, and export pending |
| Audit Logs | `/api/audit`, `/api/audit/stats/summary`; `AuditLogs.jsx`, `auditController.js` | Filtered, paginated audit history and CSV | Live pagination advanced to rows 11–20 of 333; date filters and export pending |
| Reports | `/api/reports/daily`, `/weekly`, `/monthly`; `AttendanceReports.jsx`, `reportController.js` | Period totals, first/last times, PDF/Excel | All three period tabs loaded. October 1 daily totals agree with logs but Days Present Sum is 0; October monthly shows 1 day present. Default weekly range spans 8 calendar dates. Exports pending. |
| Settings | `/api/admin/settings`, `/change-password`, `/backup`, `/clear-cache`; `Settings.jsx`, `adminController.js` | Effective controls and maintenance actions | All five panels visually reviewed. Recognition and Shift Rules display values that runtime code does not consume. Maintenance shows static green status tiles and a misplaced Save Shift Rules button. Geofencing is enabled with a 100 m radius; Security form and other interactions remain untested. |

## Findings

### P0 — Preserve attendance history when managing employees

The Employee Directory deletes through `DELETE /api/employees/:id`. The repository schema defines `attendance_logs.user_id` with `ON DELETE CASCADE` (`backend/facial_attendance_db.sql`). If production has that constraint, deleting an employee also deletes their historical attendance, changing reports and audits. Verify the production constraint before any live deletion. Prefer deactivation or archival, with historical rows retained.

### P1 — Dashboard breakdown mixes events with employee state

`dashboardController.js` counts every `IN` and `OUT` event today, then computes `not_checked_in = employee_count - IN_event_count`. One person can check in more than once, so this can be negative or make donut slices sum to more than the employee count. The page labels the donut as today's attendance breakdown, which implies a person-level state. Define whether each card counts events or people; compute current state from each employee's latest event when showing people, and keep event counts separately.

The live screenshot's 9 employees, 2 check-ins, and 1 check-out illustrate the issue: the API formula produces `2 checked in + 1 checked out + (9 - 2) not checked in = 10` donut units for 9 employees. This is a source-backed inference from the displayed event counts, not a direct capture of the JSON response.

The socket handler in `DashboardCharts.jsx` increments the top event counters but patches only an existing trend row. It does not update the donut, employee bars, or calendar. A new day with no trend row also remains absent until refresh. A live event can therefore leave widgets disagreeing with one another.

The trend query emits only dates with attendance. The live screenshot connects September 29 directly to October 1 under a “Last 7 Days” heading, omitting the zero-activity dates between them. Return a complete date series with zero values so the chart does not imply continuous activity.

### P1 — Business dates are not defined consistently

Daily Logs, Reports, and Attendance Audit use `new Date().toISOString().split('T')[0]` for date inputs. MySQL dashboard and attendance queries use `CURDATE()` or `DATE(timestamp)`. These can refer to different days around midnight in Asia/Manila. Attendance Audit also generates calendar activity dates with UTC conversion but filters rows with browser-local calendar fields. Agree on one business timezone and explicit inclusive start/exclusive end instants, then use it consistently in API queries, labels, exports, and socket updates.

### P1 — Audit Logs end-date filter loses most of the chosen day

`auditController.js` applies `timestamp <= ?` with an `endDate` supplied as `YYYY-MM-DD`. That bound is midnight at the start of the date, so later entries on the selected end date are excluded. The summary endpoint has the same pattern. Use an exclusive bound at the next day's midnight in the agreed business timezone.

`AuditLogs.jsx` also drops any filter-triggered fetch made within 300 ms of the previous fetch. When an admin changes two filters quickly, the second state change can remain visible while the rows still reflect the first query. Debounce and run the latest complete query instead; discard stale responses rather than skipping the final request. The date inputs were not reliably exercised through the connected browser, so this remains a source-confirmed risk rather than a live result.

### P1 — Attendance Audit is silently truncated

`getAllLogs` returns only the latest 1,000 attendance rows. Attendance Audit then filters that array in the browser and exports the filtered subset. A historical date can appear empty even when the database has records. Move date, employee, status, sort, and pagination filters to the API; return a total count and make CSV export cover the requested complete result set.

### P1 — Some Settings controls save values but do not control behavior

`confidence_threshold`, `camera_resolution`, `scan_cooldown`, `work_start_time`, `late_grace_period`, `work_end_time`, `auto_checkout`, and `email_alerts` appear in Settings and are saved in `system_settings`. Searches of runtime code found no consumers for them outside defaults/UI and historical SQL. The active scanner uses its own camera settings, face-match logic, and `KIOSK_TOGGLE_COOLDOWN_MINUTES`. Mark inactive controls clearly or implement and test their intended behavior before representing them as operational.

The settings API accepts arbitrary keys and values. Geofencing reads numeric strings with `parseFloat`; invalid office coordinates or radius can yield `NaN`, making the distance comparison ineffective. Validate an allowlist, numeric bounds, and cross-field requirements before saving, and fail closed when an enabled geofence has invalid configuration.

The Shift Rules screenshot displays an 8:00 AM start, 15-minute grace period, 5:00 PM end, and unchecked auto checkout. Its explanatory text presents late detection and automatic checkout as features, although runtime searches found no use of these settings. The Geolocation panel shows geofencing enabled with a 100 m radius. Its map preview was blank at capture time, which does not establish a persistent map failure. The Security password form rendered, but no password change was attempted.

### P1 — Maintenance health status is not measured

The Maintenance screenshot shows green “MySQL Database Connected,” “Redis Cache Active,” and “Socket.IO Server Real-time Active” tiles. `Settings.jsx` renders these as static text without requesting a health endpoint or checking connection state. They can remain green during an outage. Replace them with measured status from a protected API, with a timestamp and a distinct unknown/error state; alternatively remove status claims until checks exist.

### P2 — Reports and exports can misstate their contents

The daily report response has `check_ins`, `check_outs`, `first_check_in`, and `last_check_out` but no `days_present`; the shared table and PDF render Days Present as `0`. The live daily report screenshot confirms this: Days Present Sum and every employee's Days Present are 0 despite 2 IN events. Either return `days_present` for daily reports or omit that column there. CSV writers in Daily Logs and Audit Logs join fields without proper CSV escaping. Audit Logs exports only the currently fetched page, while its label does not state that limit. Exported PDF, Excel, and CSV totals should be checked against the API for the same filters.

The live Weekly Range tab defaulted to September 24 through October 1, 2026, eight inclusive calendar dates. `AttendanceReports.jsx` initializes its start date by subtracting seven days from today. For a seven-day report ending today, subtract six days, or label the control as a custom range and show the inclusive day count.

### P2 — Maintenance feedback can report success incorrectly

`clearCache` responds with HTTP 200 even when the Redis operation throws. Settings then displays a success message. Return a failure response when purge fails, and distinguish the application cache from other Redis data before using `flushAll`.

The Maintenance panel also renders a “Save Shift Rules” button wired to `saveSettings`. Remove it from that panel; the Shift Rules panel already has its own save action. Backup, cache purge, and password change were not clicked in production.

## Live authenticated review checklist

Use a signed-in admin session and a known, consented test data set. Record the page, selected filters, API status, displayed values, and a read-only SQL/API reconciliation. Do not create, delete, or change production people or settings merely to test a button.

1. **Dashboard Charts:** Compare each card and chart with independent SQL counts for the same business date. Test 7/14/30 days, a day with no records, repeated IN/OUT for one employee, a live socket event, calendar navigation, and drilldown.
2. **Employee Directory:** Check list count, search, sort, paging, modal validation, and denied camera permission. Exercise create/edit/deactivate only in staging; verify attendance history remains after deactivation.
3. **Admin Management:** Check list and role-specific controls as superadmin and standard admin. Exercise create/edit/delete in staging and verify denied actions return 403 without changing data.
4. **Attendance Audit:** Reconcile a recent and an old date with SQL, including a data set exceeding 1,000 rows. Verify calendar dots, employee/status filters, pagination, and full filtered export.
5. **Daily Logs:** Check today and a past date, status and employee filters, sort order, live event insertion, and CSV values. Test records around local midnight.
6. **Audit Logs:** Check date range inclusive of an end-date afternoon event, pagination, stats versus rows, sorting, and whether export includes all filtered rows.
7. **Reports:** Compare daily/weekly/monthly row totals with raw attendance; check no-data periods, first/last times, leap month boundaries, and PDF/Excel contents.
8. **Settings:** Read and reload every panel. In staging, test each saved control's actual effect, invalid geofence values, backup download/restore verification, password change, and cache purge success/failure.

Record the browser viewport and device type for desktop and mobile checks. Capture response statuses and error messages, but do not put passwords, JWTs, face images, precise employee locations, or complete employee records in the review notes.
