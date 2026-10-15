# Attendance Audit review — October 15, 2026

Reviewed the authenticated Attendance Audit view at https://jajr.xandree.com/admin/dashboard and its local frontend/backend implementation. No production attendance records were created, edited, or deleted. Changes below are local and require deployment.

## Findings and fixes

1. **High: CSV ignored employee and status filters.** Live reproduction: October 14 + one employee + Check In showed 1 row, while the downloaded CSV contained 14 rows, 9 employees, and both IN/OUT statuses. Export now preserves employee/status filters while allowing the modal to change dates. Invalid ranges and empty exports show an inline error.
2. **High: adjacent-month calendar dates selected the previous day.** Live reproduction: clicking the September 30 padding cell in October selected September 29. The padding used local midnight converted to UTC. Calendar cells now use consistent civil-date arithmetic; shortcuts and today's indicator use Asia/Manila, including before 08:00 PHT and at week/year boundaries.
3. **High: history was silently capped at 1,000 rows.** The backend returned only the latest 1,000 and the UI called that the total. Removed the cap and added ID as a deterministic secondary sort for equal timestamps. A backend regression covers 1,005 records. The endpoint still loads history in one response; very large histories would benefit from server pagination.
4. **Medium: audit data could not be refreshed in place.** Added Refresh records and retry behavior. Failed requests clear stale data and disable exports. Missing authentication now displays an error instead of loading indefinitely; employee-filter load failures are visible.
5. **Medium: chat launcher covered pagination.** Live clicks on Next opened chat because the floating launcher occupied the same position. The subsequent full-page review moved bottom space into the shared admin layout so page footers can scroll above the launcher. This layout adjustment requires browser verification after deployment.

## Verification

- Live Today: 3 rows; Yesterday: 14 rows; Yesterday + Check In: 9 rows; adding one employee: 1 row. This Week selected October 12–15 and showed 22 rows.
- Downloaded the production CSV and checked its row, employee, and status counts to reproduce finding 1.
- Frontend regression coverage includes combined filters and actual CSV contents, manual provenance, string/numeric employee IDs, invalid/empty exports, pagination reset, refresh recovery, missing sessions, calendar collapse/reset, month padding, and Philippine midnight/week/year boundaries.
- Backend audit regression covers complete history beyond 1,000 and deterministic ordering.
- Validation passed: full frontend suite (29 tests), followed by the final focused audit suite (9 tests, including one added afterward), and the backend audit test (1 test). Live keyboard activation of Next advanced from records 1–5 to 6–10, confirming that the chat overlap affects mouse access rather than pagination logic.
- Production frontend build succeeds. Existing Vite deprecation and chunk-size warnings remain.

## Limits

These checks validate display/filter/export behavior against supplied attendance timestamps. They do not independently establish whether historical scans reflect actual employee arrival/departure. Map availability depends on Google Maps; no live employee coordinates were deliberately opened in an external map during this review. Production fixes and the pagination spacing still need verification after deployment.
