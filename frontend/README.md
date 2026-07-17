# Face Recognition Attendance System - Frontend

A modern, responsive React-based frontend for a facial recognition attendance system. Built with React, Tailwind CSS, and face-api.js.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **face-api.js** - Face detection and recognition
- **PostCSS + Autoprefixer** - CSS processing

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CameraFeed.jsx       # Webcam access and face detection
│   │   └── AttendanceCard.jsx   # Status display and attendance logging
│   ├── utils/
│   │   └── faceApiLoader.js     # Model loading and face descriptor utilities
│   ├── App.jsx                  # Main application layout
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles with Tailwind directives
├── public/
│   └── models/                  # face-api.js model files (add manually)
├── index.html                   # HTML entry point
├── package.json                 # Dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── postcss.config.js            # PostCSS configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Download face-api.js Models

Download the required face-api.js model files and place them in the `public/models` directory:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_landmark_68_model-shard2`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

You can download these models from the official face-api.js repository:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Place them in: `frontend/public/models/`

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Ensure Backend is Running

Make sure your Node.js backend is running on `http://localhost:5000` with the following endpoints:

- `GET /api/users` - Fetch registered users with face descriptors
- `POST /api/attendance/log` - Log attendance (expects `{ userId, status }`)

## Features

### CameraFeed Component
- Accesses user's webcam via `navigator.mediaDevices.getUserMedia`
- Runs face detection at ~5-10 FPS using `tinyFaceDetector`
- Computes face landmarks and descriptors
- Matches detected faces against registered users using `faceapi.FaceMatcher`
- Draws detection boxes with confidence indicators (green = match, red = no match)

### AttendanceCard Component
- Displays current system status (loading, ready, error)
- Shows recent attendance records with timestamps
- Automatically logs attendance when a face is recognized (confidence < 0.6)
- Displays toast notifications for successful/failed attendance logging
- Toggles between IN/OUT status based on last attendance

### faceApiLoader Utilities
- `loadModels()` - Loads face-api.js models from `/models`
- `fetchRegisteredUsers()` - Fetches users from backend API
- `createLabeledFaceDescriptors()` - Parses stored face descriptors and creates labeled descriptors
- `initializeFaceMatcher()` - Initializes face matcher with registered users

## API Integration

The frontend connects to the backend at `http://localhost:5000/api`:

### Fetch Users
```javascript
GET http://localhost:5000/api/users
Response: [{ _id, name, faceDescriptor, ... }]
```

### Log Attendance
```javascript
POST http://localhost:5000/api/attendance/log
Body: { userId: string, status: 'IN' | 'OUT' }
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Browser Requirements

- Modern browser with webcam support
- HTTPS or localhost required for webcam access
- JavaScript enabled

## Notes

- The CSS lint warnings for `@tailwind` directives will resolve after running `npm install` as the PostCSS Tailwind plugin will be installed
- Face detection confidence threshold is set to 0.6 (adjustable in code)
- 5-second cooldown between attendance logs for the same user to prevent duplicate entries
- Camera resolution is set to 640x480 for optimal performance
