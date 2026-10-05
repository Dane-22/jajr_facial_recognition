# Facial recognition camera and mirroring review

Reviewed: 2026-10-05

## Answer

The web kiosk and employee enrollment previews are **mirrored horizontally for display**. Both request the front camera, but `facingMode: 'user'` only selects a camera; the preview flip comes from a CSS transform. The kiosk still sends the original, unflipped video frame as a JPEG to the server. A particular webcam driver or browser may also affect what a person sees, so confirm the appearance on the device in question.

The mobile app selects the front camera but does not explicitly set a mirror option. This code review alone does not establish how its preview or saved photo appears on each device and platform.

## Current paths

| Path | Preview | Data used for recognition | Mirror setting in this app |
| --- | --- | --- | --- |
| Web attendance kiosk | `<video>` from `getUserMedia({ facingMode: 'user' })` in `frontend/src/components/CameraFeed.jsx` | A video frame is drawn to a canvas, encoded as JPEG, and posted to `/api/face/kiosk-attendance`. The server detects and matches the face. | CSS flips only the displayed video; the capture canvas is not flipped. |
| Web employee enrollment | `<video>` and a face-box `<canvas>` in `frontend/src/components/EmployeeList.jsx` | Browser `face-api.js` reads the video directly and stores three face descriptors. The canvas draws the detection box only. | CSS flips both the video and face-box overlay; descriptors are taken from the original video. |
| Mobile attendance | Expo `CameraView` with `facing="front"` in `mobile/src/screens/CameraScreen.js` | `takePictureAsync()` returns a photo; the image manipulator may resize it, then uploads JPEG base64 to `/api/face/attendance`. The server detects and matches the face. | No explicit mirror configuration or flip operation in this screen. Device behavior needs a live check. |

The backend's `backend/services/faceRecognition.js` decodes the uploaded image and extracts a descriptor. It does not flip images. Its matching rules currently require exactly one face, a detection box at least 80 pixels wide, a best average descriptor distance below `0.4`, and at least `0.05` separation from the next candidate. Thus a mirror-looking preview is a display issue by itself; it does not prove that matching is broken. Lighting, face size, and enrollment angle can also affect a scan.

## Why the preview looks different from a mirror

A mirror view reverses left and right **for display**: raise your right hand and it appears on the same side of the screen as your right hand. An unmirrored view looks like a photograph taken by someone facing you. `facingMode: 'user'` and `facing="front"` refer to which lens is used, not to the horizontal orientation of the picture.

For the web kiosk, the preview element uses `-scale-x-100`, a CSS horizontal flip. Its capture uses `drawImage(video, ...)` with no canvas transform, so the bytes submitted by this app follow the video source orientation. The motion detector also draws from that source video.

For enrollment, face-api reads the video source directly. The detection-box canvas is positioned on top of the video. Both display elements use the same horizontal flip so the box stays with the detected face.

## Recommended display behavior

The web paths now mirror **only the visible front-camera preview**. The source frame, descriptors, and uploaded JPEG remain unflipped. On the kiosk, the CSS transform applies to its `<video>` because its oval guide is symmetric and does not mark face coordinates. On enrollment, the video and face-box overlay are flipped together; buttons and text stay in their normal orientation.

Treat mobile separately: test both its preview and the resulting uploaded photo on the supported Android and iOS devices before choosing an explicit camera or image setting. Preview orientation and photo orientation can differ. Any change to captured pixels should be evaluated against existing enrollment samples with real-device recognition checks.

## How to verify

1. Open the web kiosk and employee enrollment on a device with a visible left/right marker (for example, a word on a shirt or a raised hand). Confirm that the on-screen image behaves like a mirror.
2. Check that the enrollment face box stays on the face.
3. Enroll one person with the existing three-sample workflow. Scan that person on the web kiosk and mobile app, recording whether recognition succeeds. Test with a single face, frontal lighting, and adequate image size.
4. On mobile, compare the live preview with the saved/captured image on each supported platform. The source code does not specify their mirroring behavior.

## Source locations

- `frontend/src/components/CameraFeed.jsx`: frame capture and upload around lines 133-149; camera request around 260; preview around 321.
- `frontend/src/components/EmployeeList.jsx`: camera request around 153-162; descriptor extraction and overlay drawing around 188-221; preview and overlay around 746-761.
- `mobile/src/screens/CameraScreen.js`: photo capture and processing around 58-67; front-camera view around 81.
- `backend/services/faceRecognition.js`: decoding, detection, and matching around 41-77.

This is a source-code review and web-preview change. It does not include a live webcam or phone test.
