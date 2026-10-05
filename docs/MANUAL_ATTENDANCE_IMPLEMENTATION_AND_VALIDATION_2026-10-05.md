# Manual Attendance implementation and validation

Date: 2026-10-05 (Asia/Manila)

## Implemented

- Superadmin-only Manual Attendance tab with searchable, one-card-per-employee mobile layout and an explicit review step.
- Single time-in, single time-out for an open session, and historical paired time-in/time-out within 30 days. Server validation rejects conflicting chronology and future entries.
- Database-backed role checks on reads and writes; attendance, provenance, and audit rows written in one transaction under the same employee lock used by scanner attendance. A paired correction creates two distinct logs and leaves a later open session unchanged.
- Asia/Manila input, attendance display, day grouping, dashboard summaries, and CSV exports. Manual details show effective time, creation time, actor, and reason.
- Settings correction form replaced by a shortcut to Manual Attendance; the prior correction endpoint delegates to the shared service.

## Verification

- Backend: 15 existing tests plus 4 focused manual attendance tests passed. The focused tests cover paired writes with a later open session, rejection of a conflicting single time-in, live role denial, and time validation.
- Frontend: lint, production build, and 10 existing tests passed.
- Browser review used mocked employee data and a local Vite server. Captured [320 px](manual-attendance-evidence-2026-10-05/320-manual-attendance.png), [360 px](manual-attendance-evidence-2026-10-05/360-manual-attendance.png), [390 px](manual-attendance-evidence-2026-10-05/390-manual-attendance.png), [430 px](manual-attendance-evidence-2026-10-05/430-manual-attendance.png), [short 320 px](manual-attendance-evidence-2026-10-05/short-320-manual-attendance.png), and [200% zoom equivalent](manual-attendance-evidence-2026-10-05/zoom-200-effective-195-manual-attendance.png) screenshots. Each had two separate employee cards, a visible action, and document width equal to viewport width; see [metrics](manual-attendance-evidence-2026-10-05/metrics.json).
- The 200% check used a 195 CSS-pixel viewport to simulate a 390-pixel window at 200% zoom. A browser zoom control was not available, so this is a layout equivalent rather than a direct zoom interaction.

## Remaining live validation

The local browser check used mocked API data. The new database migration and a real attendance write were not exercised against a running MySQL instance. Before production release, use a staging database to verify migration, time conversion, session behavior, exports, and the role checks with real accounts. No production deployment was performed.
