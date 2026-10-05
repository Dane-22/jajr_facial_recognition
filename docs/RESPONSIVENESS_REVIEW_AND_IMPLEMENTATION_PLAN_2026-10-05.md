# Responsiveness review and implementation plan

Date: 2026-10-05 (Asia/Manila)

Status: **Historical discussion draft.** The later screenshot clarification and go signal authorized implementation. See [implementation and validation](RESPONSIVENESS_IMPLEMENTATION_AND_VALIDATION_2026-10-05.md) for completed web admin work. Native Expo and other items in this original broad plan remain outside that implementation scope.

Reviewed source: local commit `58ebc5a`.

## Scope and method

This review covers the shipped browser kiosk and PWA (`frontend/src/App.jsx`), browser admin login and all eight admin sections (`frontend/src/components/`), chat and install overlays, and the Expo attendance app (`mobile/App.js` and its three screens). It focuses on usable layout across narrow/short phones, tablets, desktop windows, keyboard and text-size changes, and system insets. The separate `react-native-movie-app/` is a movie sample, not part of the attendance app or deployment.

Findings below are based on source and layout constraints. No device simulator, browser viewport sweep, screenshot comparison, or physical phone test was run in this review. Items marked **risk** need rendered verification before treating them as observed defects. Some existing patterns are sound: the kiosk uses a bounded camera area, many admin grids collapse to one column, tables have horizontal scroll wrappers, Settings subtabs scroll, and the employee modal has a viewport-height limit with internal scrolling.

## Findings to address

| Priority | Surface and evidence | Finding / likely effect | Proposed direction |
| --- | --- | --- | --- |
| High | Browser viewport, `frontend/index.html:7` | `maximum-scale=1.0, user-scalable=no` prevents normal pinch zoom. This limits usability for people who need larger text and masks layout problems at zoom. | Allow browser zoom; make pages reflow and remain operable at 200% zoom. |
| High | Native login, `mobile/src/screens/LoginScreen.js:7, 23-75, 77-95` | Window width and height are captured once at module load. The centered form has no scroll or keyboard avoidance. On a short screen, with a keyboard open, or with larger system text, the submit button can become unreachable; tablet width can make the card unnecessarily wide. | Use current window/inset measurements, a bounded card width, safe-area-aware scroll, and keyboard handling. |
| High | Native camera, `mobile/src/screens/CameraScreen.js:79-110, 123-164`; tab bar, `mobile/App.js:76-107` | The overlay reserves 80 px at both ends, uses a fixed 250 px square, and adds 60 px below the button. The tab bar is absolutely positioned with a fixed 70 px height and 25 px bottom offset. On short phones, large text, or devices with a home indicator, the framing guide and capture control risk overlap or clipping. | Size the frame from available space, anchor controls to safe insets and actual tab-bar height, and keep the capture button visible in the smallest supported portrait viewport. |
| High | Chat widget, `frontend/src/components/AIChatWidget.jsx:401-445` | The open panel is fixed at 580 px tall. At short browser heights or 200% zoom, its top can leave the viewport, hiding its header and close action. | Bound height by available viewport and safe-area insets; consider a full-screen phone layout. |
| High | Admin add/edit dialogs, `frontend/src/components/AdminManagement.jsx:365-390, 473-490`; employee dialog, `EmployeeList.jsx:676-684` | Admin account dialogs center a long form without a height limit or scroll region. The employee dialog already has `max-h-[90vh] overflow-y-auto`, showing the intended pattern. At short heights or with browser zoom, admin dialog actions risk leaving the viewport. | Give every dialog an accessible scroll region, visible heading/close action, and keyboard-safe focus behavior. |
| Medium | Kiosk header, `frontend/src/App.jsx:39-72`; recent attendance, `AttendanceCard.jsx:13-20` | Brand, admin link, and connection status stay on one horizontal row; recent attendance also keeps name, status, and time in one row. Long text can crowd or overflow a narrow phone. | Let the header wrap or stack and let attendance details wrap while retaining clear status. |
| Medium | Admin shell, `frontend/src/components/AdminLayout.jsx:141-185, 253-263` | The content uses `w-full` with a desktop sidebar offset and `overflow-x-hidden` at outer levels. This may conceal controls that exceed available width instead of exposing a local scroll area. **Risk requiring viewport measurement.** | Verify content width at the `md` breakpoint; use `min-w-0` and a single width/offset strategy; keep horizontal scrolling local to tables. |
| Medium | Audit/records, `AuditLogs.jsx:244-276`, `AttendanceAudit.jsx:319-347, 576-625`, `UI/Table.jsx:32-54`, and Employee/Daily/Reports tables | Audit statistics are always four columns, while data tables use many `whitespace-nowrap` cells. Table scrolling exists, but narrow phones can show only a sliver of data and controls without a visible scroll cue. | Stack summary cards at small widths; choose a phone record layout or make table scrolling obvious and preserve row actions. |
| Medium | Report and filter controls, `AttendanceReports.jsx:168-225`, `DailyLogs.jsx:253-381`, `AttendanceAudit.jsx:319-380`, `Settings.jsx:245-295` | Several title/badge and action groups remain single-row within their section. The report-mode button group does not itself wrap. Settings tabs scroll but provide no visible cue that more tabs exist. **Risk requiring rendered verification.** | Allow local wrapping or stacking, use full-width controls when needed, and expose horizontal-tab affordance. |
| Medium | Site assignment and touch controls, `SiteManagement.jsx:117-145`, `AttendanceAudit.jsx:400-431`, `Settings.jsx:245-295` | The assignment row gives names a 9 rem minimum and packs checkboxes and actions into one flex row. Calendar day buttons are 36 px high; several icon/text actions use small padding. These can be hard to use with touch or larger text. | Stack assignment metadata/actions on phones and set practical minimum touch areas without losing calendar density. |
| Medium | Native dashboard and permission state, `mobile/src/screens/DashboardScreen.js:6-29`, `CameraScreen.js:22-42` | Both use centered, non-scrolling content. Longer localized text or larger system fonts can push actions beyond a short screen. | Put primary content in a safe-area-aware scroll region with minimum control sizes and readable text scaling. |
| Low | Portrait support, `mobile/app.json:6` | The native app is locked to portrait. Tablet and landscape behavior is undefined by product choice rather than by responsive layout alone. | Confirm whether portrait-only is intentional before planning landscape work. |

## Screen-by-screen review coverage

| Screen/group | Existing behavior worth keeping | Primary review target |
| --- | --- | --- |
| Kiosk `/` and admin login | Camera aspect ratio and bounded card; login max width | Header wrap, confirmation on short screens, zoom and keyboard |
| Dashboard charts | Two-column to one-column grid, inner body scroll | Chart labels, dashboard width around 768 px, 200% zoom |
| Daily Logs, Attendance Audit, Audit Logs | Local table overflow wrappers and some stacked headers | Summary cards, calendar/filter controls, row access on phones |
| Employee Directory and enrollment | One-column form on narrow screens; scrollable enrollment modal | Search/action header, table, camera/overlay fit on short landscape windows |
| Attendance Reports | Responsive summary cards and table scroll | Report-mode buttons, exports, table reading at 320–390 px |
| Admin Management | Table has overflow wrapper | Add/edit dialog height, keyboard and long validation messages |
| Settings and Site Management | Scrollable tab strip and collapsing form grids | Tab discoverability, assignment rows, map and correction inputs |
| Chat and PWA install prompt | Chat width follows the phone viewport; install prompt has phone margins | Chat height, keyboard, close button, overlap with install prompt |
| Native Login, Dashboard, Camera | Simple three-screen path; `SafeAreaProvider` exists | Safe-area use, keyboard, font scaling, short heights, tab/camera overlap |

## Proposed implementation sequence — after go signal

1. **Establish a reproducible baseline.** Capture the current browser screens and measured overflow at 320×568, 360×640, 390×844, 430×932, 768×1024, 1024×768, and 1440×900. Repeat key pages at 200% browser zoom. On iOS and Android, test a small phone, a typical phone, and a tablet if tablet support is chosen; include keyboard open and larger system text. Record screenshots and unreachable controls, not just `scrollWidth`.
2. **Fix shared web foundations.** Restore browser zoom, correct any admin-shell width clipping, define consistent narrow-screen spacing and wrapping, and provide reusable modal and touch-control patterns. Keep table overflow inside the table area.
3. **Fix the native critical path.** Refactor login, dashboard, permission, camera, and tab layout around safe areas, available height, and keyboard state. Keep the face-capture and server-matching behavior unchanged. Verify button visibility through permission, geolocation, processing, success, and error states.
4. **Adapt data-heavy admin screens.** Address audit summary cards, calendar, filters, report modes, site assignments, and add/edit dialogs. Decide whether phone records should become cards or remain tables with clear horizontal scrolling. Preserve every field, row action, filter, and export function.
5. **Fit kiosk and overlays.** Wrap the kiosk header, make recent attendance legible, constrain chat height or use a phone full-screen presentation, and prevent install/chat overlays from covering essential actions.
6. **Regression and device acceptance.** Add focused viewport checks to the existing frontend test setup, then verify actual iOS/Android devices or emulators. Recheck camera preview framing, enrollment box alignment, attendance flow, permissions, and PWA reload. Document remaining device-specific limitations before release.

## Acceptance criteria for implementation

- At the agreed minimum web width, the page itself has no unintended horizontal overflow; deliberate table overflow remains usable and signposted. Headings, filters, actions, dialogs, and error messages stay reachable at short heights and 200% zoom.
- Browser zoom works. Essential controls remain readable and operable with keyboard and touch; controls do not depend on hover alone.
- Native Login, Dashboard, permission prompt, and Camera keep their primary action reachable with the keyboard open, larger system text, status bars/notches, and bottom navigation visible. Camera framing and controls do not overlap.
- The responsive work does not change captured image orientation, face descriptors, scan matching, attendance rules, or the current portrait policy unless agreed separately.
- Each of the eight admin sections and both scanner paths passes the agreed viewport/device matrix with screenshot evidence and no clipped modal action.

## Decisions for discussion

1. Should the native app remain portrait-only, and must tablets be supported in this release?
2. On phones, should records use compact cards or horizontally scrollable tables with a visible scroll cue?
3. Should chat occupy the full phone screen when open, or stay a bounded floating panel?
4. What is the smallest supported browser viewport and native device/font scale? The proposed baseline starts at 320 px web width and includes 200% zoom.

No frontend, mobile, test, configuration, or deployment code was changed as part of this review. Implementation waits for the user's go signal.
