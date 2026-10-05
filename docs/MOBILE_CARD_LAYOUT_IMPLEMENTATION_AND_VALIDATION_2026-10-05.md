# Admin mobile record cards

Date: 2026-10-05 (Asia/Manila)

The user's revised decision replaces horizontally scrollable **phone** data tables with one card per existing record. Desktop tables remain at widths of 768 CSS px and above. No production deployment was performed.

## Implementation

| View | Phone card | Fields and actions retained |
| --- | --- | --- |
| Employee Directory | One per employee on the current page | Name, role, employee ID, creation date, Edit and Delete. Search, filters, sort, and pagination still drive the same `currentEmployees` array used by the desktop table. |
| Attendance Reports | One per employee summary on the current page | Name, role, days present, check-ins, check-outs, and daily first/last scan times. Report mode, date controls, export, and pagination remain shared. |
| Daily Logs | One per attendance scan on the current page | Name, record ID, status, timestamp, role, site, coordinates, and expandable map. Date, employee, status, sort, export, and pagination remain shared. |
| Attendance Audit | One per attendance record on the current page | Name, record ID, status, timestamp, role, site, coordinates, and expandable map. Calendar and dropdown filters, export, and pagination remain shared. |
| Admin Management | One per admin account | Username, role, account ID, creation date, active-account state, and the same permission-controlled Edit/Delete handlers. Search remains shared. |
| Audit Logs | One per activity event on the current page | User, event ID, action, timestamp, user type, entity type/ID, and IP address. Filters, sort, export, and pagination remain shared. |
| Dashboard date dialog | One per attendance scan | Name, record ID, role, time, and status; desktop keeps its table. |
| Legacy admin dashboard | One per attendance scan | Name, record ID, role, timestamp, and status; desktop keeps its table. This component is not currently routed through the main admin shell. |

Cards map the same row arrays as their desktop tables. Repeated employee names therefore produce separate cards whenever the source has separate records. Secondary fields use an expandable section. Location maps remain available behind a second disclosure and fit the card width.

## Mobile screenshots for review

These are local Chromium captures with mocked records, including repeated names. They show layout and card behavior without production data.

| View | Card screenshot | Expanded details |
| --- | --- | --- |
| Employee Directory | [390 px](mobile-card-evidence-2026-10-05/390-employees-cards.png) | — |
| Attendance Reports | [390 px](mobile-card-evidence-2026-10-05/390-reports-cards.png) | — |
| Daily Logs | [390 px](mobile-card-evidence-2026-10-05/390-logs-cards.png) | [320 px with location](mobile-card-evidence-2026-10-05/320-logs-details.png) |
| Attendance Audit | [390 px](mobile-card-evidence-2026-10-05/390-audit-cards.png) | [320 px with location](mobile-card-evidence-2026-10-05/320-audit-details.png) |
| Admin Management | [390 px](mobile-card-evidence-2026-10-05/390-admin-management-cards.png) | — |
| Audit Logs | [390 px](mobile-card-evidence-2026-10-05/390-audit-logs-cards.png) | — |
| Dashboard date dialog | [390 px](mobile-card-evidence-2026-10-05/390-dashboard-date-dialog-cards.png) | [390 px dark theme](mobile-card-evidence-2026-10-05/390-dashboard-date-dialog-dark.png) |
| Legacy admin dashboard | [390 px](mobile-card-evidence-2026-10-05/390-legacy-attendance-cards.png) | — |

## Validation

- Local Chromium checked the six main record pages plus the dashboard date dialog at 320, 360, 390, and 430 CSS px; 320 × 480; a 195 px effective width representing a 390 px viewport at 200% zoom; and 1280 px desktop. [Measurements](mobile-card-evidence-2026-10-05/metrics.json) cover 49 page/viewport combinations. Every checked phone view displayed cards and hid its table; desktop displayed the table and hid the cards. The count of cards matched the count of underlying table rows. No page-level horizontal overflow or JavaScript errors were found.
- A separate local browser check verified the legacy admin dashboard at 390 and 1280 px with two distinct scans for the same employee.
- The dashboard date dialog was also checked in dark mode at 390 px.
- Mocked interactions verified Employee Directory edit and search, Attendance Audit and Daily Logs status filters, Admin Management search, Audit Logs action filter, pagination on each paged section, expandable site/map details, and non-superadmin read-only permissions.
- `npm run build`, `npm run lint`, and `npm run test` passed (10 frontend tests). The existing large-bundle warning remains in the build output.

## Verification limits

The browser tests used mocked API data. Production records, real backend filtering/sorting, live socket updates, export downloads, external map tiles, and physical touch behavior were not exercised. The 200% check used the equivalent effective CSS layout width rather than automating the browser's zoom menu. The temporary legacy test harness was removed after validation.
