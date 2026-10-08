# Facial recognition camera guide

Reviewed: 2026-10-08

## Shape and placement

The web attendance kiosk shows a **portrait oval guide** over the camera preview while scanning is active. It is taller than it is wide, with a 3:4 width-to-height ratio. The green outline is centered inside the existing 4:3 preview.

The shape comes from the overlay in [`CameraFeed.jsx`](../frontend/src/components/CameraFeed.jsx):

```jsx
<div style={guideStyle} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-emerald-400/40 pointer-events-none" />
```

The guide's height starts at 78% of the **visible video image**. Its width follows the 3:4 ratio and is capped so the guide stays within 80% of the visible video's width. This accounts for 16:9 or portrait streams that are letterboxed by `object-contain` in the 4:3 preview. The guide appears only when the camera status is `active`.

## What the guide does

The oval helps a person position their face. “Center your face in the oval” and the in-progress scan timer appear below the preview, leaving the guide unobstructed. The outline is visual guidance: it does not crop the camera image or limit recognition to the area inside it. The kiosk captures the full video frame for server-side face detection and matching. The overlay also does not block camera controls because it uses `pointer-events-none`.

The web video preview itself is mirrored left to right for display. That mirroring does not change the portrait oval's shape. The uploaded frame is drawn from the original video source.

## Verification

Open the kiosk, allow camera access, and confirm the active preview shows a centered green oval that is taller than it is wide. Check it at phone and desktop widths and with different camera aspect ratios. A live camera check is needed to confirm placement on a specific device.

For camera preview mirroring and mobile camera behavior, see the [camera and mirroring review](FACE_RECOGNITION_CAMERA_MIRRORING.md).
