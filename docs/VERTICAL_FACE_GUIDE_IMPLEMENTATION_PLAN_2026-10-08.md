# Vertical face guide: discussion and implementation plan

Status: **Implemented locally on 2026-10-08; verification and release status below.**

## Current behavior

The web kiosk renders a centered green outline over the active camera preview in `frontend/src/components/CameraFeed.jsx`. The preview container has a 4:3 aspect ratio. The overlay uses `absolute inset-0`, `m-[15%]`, and `rounded-full`; its remaining area is wider than it is tall, so the outline is a horizontal oval. It is a visual positioning aid. Capture still draws the full source video frame to a canvas, and the server detects faces in that full frame.

The enrollment screen's face-box overlay is a separate feature. The mobile scanner does not use this kiosk guide.

## Proposed outcome

Show a **portrait oval** in the web kiosk: taller than it is wide, centered over the face area and visible only while scanning is active. Keep the green outline, camera behavior, uploaded image, face matching, and attendance rules as they are unless the discussion explicitly changes that scope.

## Decisions to settle before implementation

1. **Shape:** portrait oval or a true circle? A circle has equal width and height; “vertical circular guide” suggests a portrait oval, but the intended visual should be confirmed with a sketch or screenshot.
2. **Size:** how much of the preview should the oval occupy on phones and desktops? It should fit a face plus some headroom without reaching the preview edges or colliding with the scan-status badge.
3. **Preview frame:** retain the existing 4:3 camera area or change its visible aspect ratio? A portrait guide can fit inside 4:3 without changing the camera frame. Changing the frame would be a broader layout decision.
4. **Meaning:** should the oval remain guidance only, or should scanning require a face inside it? Enforcing it would require coordinate mapping between preview, source video, and server detection, including mirrored display and `object-contain` letterboxing. That is a separate recognition behavior change.
5. **Instruction text:** decide whether to add a short prompt such as “Center your face in the oval.” Current scan messages appear below the preview.

## Recommendations for discussion

1. **Shape:** use a 3:4 width-to-height portrait oval. This is visibly taller than it is wide and gives room for a face without making a narrow slit.
2. **Size:** start with the oval height at about 75-80% of the **visible video image**, then derive width from the 3:4 ratio. Reserve clear space around the outline and scan-status badge. This is a design target, not a fixed pixel size; check it on phones and desktops before choosing final CSS. Sizing from the visible image matters because a 16:9 camera stream can be letterboxed inside the current 4:3 container.
3. **Preview frame:** retain the current 4:3 container initially. Center the oval over the actual `object-contain` video area and avoid stretching or cropping the preview merely to fill the guide. Revisit the frame only if real-device checks show too much unused space or poor face placement.
4. **Meaning:** keep the oval **visual guidance only** for this change. The server should continue to detect a face anywhere in the full uploaded frame. Requiring the face to be inside the oval would change scan acceptance and needs separate calibration and recognition testing.
5. **Instruction text:** add a short line below the preview: “Center your face in the oval.” Keep existing scan, location, and error messages visible. Do not imply that the outline itself controls recognition while it remains visual guidance.

## Implementation sequence after decisions

1. Choose the portrait oval's target width-to-height ratio and minimum edge spacing from representative phone and desktop mockups.
2. Replace the overlay's percentage-margin sizing in `CameraFeed.jsx` with explicit responsive width and height constraints. Center it within the preview and keep `rounded-full` and `pointer-events-none`. Keep it inside the camera bounds at narrow widths and short heights.
3. Check the overlay against the `object-contain` video image. If source aspect ratios cause letterboxing, place the guide where the visible face is expected rather than assuming every stream fills the 4:3 container.
4. If agreed, add concise positioning text. Keep scan progress, location errors, confirmation, and camera permission messages readable.
5. Update `docs/documentation.md` and any guide screenshots after the visual design is accepted.

## Verification after implementation

- Inspect the active kiosk at 320, 360, 390, 430, and desktop CSS-pixel widths, including a short phone viewport and 200% zoom. Confirm the oval is taller than it is wide, centered, fully visible, and clear of status text.
- Check a landscape phone view and camera streams with 4:3, 16:9, and portrait source ratios for clipping or misleading placement.
- Confirm the guide disappears in inactive/error states and does not intercept input. Confirm the mirrored preview still behaves as before.
- Confirm frame capture still uses the full unflipped source video and that a consented test scan succeeds with the face inside the guide. If the guide stays visual-only, a face outside it must not be claimed as blocked by the UI.
- Run the focused `CameraFeed` test, frontend lint, and production build. Record screenshots for the agreed viewport set before release.

## Scope boundary

This plan does not change face detection thresholds, crop uploaded images, alter the 4:3 preview, or modify mobile and enrollment cameras. Any of those can be added to the plan after discussion.

## Local implementation

- The kiosk overlay now uses a centered 3:4 portrait oval. It is sized from the source video's visible dimensions inside the unchanged 4:3 `object-contain` preview, including letterboxed streams.
- The guide remains visual guidance. The instruction below the preview and the kiosk's “How to Use” text now ask people to center their face in the oval.
- The in-progress timer moved below the preview so it cannot cover the top of the portrait oval on small screens.
- Frame capture, face matching, and mobile/enrollment camera paths remain as before. Live camera placement and production deployment are not yet verified.
- Local verification passed: 14 frontend tests (including guide sizing for 4:3, 16:9, and portrait video), frontend lint, and the production build. A physical-device visual check and consented live scan are still needed before release.
