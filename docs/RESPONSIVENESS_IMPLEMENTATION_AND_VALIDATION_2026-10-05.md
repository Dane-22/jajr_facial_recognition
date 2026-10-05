# Web admin mobile responsiveness: implementation and validation

Date: 2026-10-05 (Asia/Manila)

Status: **Superseded for mobile data presentation.** The user later chose one card per record on phones. See [mobile card implementation and validation](MOBILE_CARD_LAYOUT_IMPLEMENTATION_AND_VALIDATION_2026-10-05.md). The screenshots and findings below document the earlier table-based iteration.

Scope: the web admin/PWA pages shown in the user's `img/` screenshots. The screenshots were treated as evidence of defects, not layouts to reproduce. No production deployment was performed.

## Findings and fixes

| Area | Cause observed in source and screenshots | Change |
| --- | --- | --- |
| Dashboard | A two-column phone grid, truncated labels, and inline LIVE badges squeezed card text. | Use one column on phones; allow labels and values/badges to wrap; reduce phone padding. Calendar navigation wraps and its seven-day grid gets local scrolling on very narrow layouts. |
| Employee Management | Fixed-width search plus filter and add controls exceeded the card. | Wrap actions and give search the available width. Reduce nested phone padding. Remove the table's 18 rem minimum height. |
| Attendance Audit and Daily Logs | Every location cell contained an always-visible 200 × 120 map iframe, determining row height. | Collapse the same coordinate and map view behind a “View map” disclosure. Records are about 59 CSS px tall with the mocked data; map expansion remains available. |
| Audit Logs | Four summary cells were forced into one row. | Use one, two, or four columns according to available width, with readable labels and wrapping for action names. |
| Tables | Wide columns needed local scrolling, but the affordance was unclear. | Add visible swipe cues, keyboard-focusable horizontal regions, and visible scrollbars to employee, admin, audit, daily, and report tables. Keep all columns and actions. |
| Shared layout and chat | Phone page/cards had several layers of padding; the fixed chat button obscured controls. | Reduce phone padding. Place the chat trigger in the mobile header, clear of content; at extremely narrow effective widths it becomes an in-flow control after the page. Bound the open panel to viewport height. |
| Zoom | The viewport tag disabled user zoom. | Permit browser scaling and reflow. |

## Before and after visual evidence

After screenshots use **mocked records in local Chromium** to show layout without exposing production data. Before screenshots are the user's original mobile captures.

| Issue | Before | After |
| --- | --- | --- |
| Dashboard cards and badges | [original](../img/2643ac97-44c1-4e02-8081-dbe313a8c249.jpg) | [390 px](responsive-evidence-2026-10-05/390-dashboard.png) |
| Employee search and controls | [original](../img/07f3dd6d-356d-4c07-a834-eab875f79772.jpg) | [390 px](responsive-evidence-2026-10-05/390-employees.png) |
| Attendance Audit row height | [original](../img/62fbdbe6-e775-4070-b31c-d594c0fddc76.jpg) | [390 px table](responsive-evidence-2026-10-05/390-audit-table.png) |
| Daily Logs table | [original](../img/1c0e2dc5-055f-400f-9899-472aa4a89bed.jpg) | [390 px table](responsive-evidence-2026-10-05/390-logs-table.png) |
| Audit Logs summary and pager | [original summary](../img/27c3d251-2e02-4d1c-830c-05b861af9862.jpg), [original pager](../img/fc7f9ae4-1e76-4f9e-9289-47aac0515c9c.jpg) | [390 px summary](responsive-evidence-2026-10-05/390-audit-logs.png), [390 px table and pager](responsive-evidence-2026-10-05/390-audit-logs-table.png) |
| Attendance report table | [original](../img/e4c599e3-23cf-4590-962a-4ec97c4f19cc.jpg) | [390 px table](responsive-evidence-2026-10-05/390-reports-table.png) |
| Short and zoomed screens | [original chat over controls](../img/e635cd6b-2c3c-4b1d-b2a8-9958892f6369.jpg) | [320 × 480](responsive-evidence-2026-10-05/short-320-logs.png), [195 px effective width](responsive-evidence-2026-10-05/zoom-200-effective-390-dashboard.png) |

## Validation

- Local Chromium with mocked API responses: seven admin pages at 320, 360, 390, and 430 CSS px; a short 320 × 480 viewport; and a 195 px effective layout width representing a 390 px viewport at 200% browser zoom. [Machine-readable measurements](responsive-evidence-2026-10-05/metrics.json) cover 42 page/viewport combinations.
- Result: no page-level horizontal overflow, no non-table controls outside the viewport, and no JavaScript page errors in those 42 combinations. Table columns remain available through their local scroll containers. The map disclosure opened and closed in both Attendance Audit and Daily Logs.
- At 390 px, mocked record row heights were 59 px in Attendance Audit and Daily Logs, 46 px in Attendance Reports, 45 px in Audit Logs, and 65 px in Employee Management.
- `npm run build`, `npm run lint`, and `npm run test` passed (10 frontend tests). The build still reports its existing large AdminLayout chunk warning.

## Verification limits

- The browser checks used mocked API records and local Chromium, so production data lengths, real API behavior, socket updates, downloads, camera capture, and physical touch behavior were not verified.
- The 200% check used the **equivalent effective CSS layout width**. Native browser zoom UI and OS text scaling were not directly automated.
- The before images are supplied device screenshots; the after images are browser captures with test data, so they demonstrate layout changes rather than pixel-identical data comparisons.
