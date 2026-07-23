# Setup Guide for Face Recognition Attendance System

This guide will help you set up the Face Recognition Attendance System on a new device after cloning the repository.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v5.7 or higher) - [Download here](https://www.mysql.com/downloads/)
- **Git** - [Download here](https://git-scm.com/downloads)
- **A modern web browser** (Chrome, Firefox, Edge, etc.)

## Step 1: Clone the Repository

```bash
git clone https://github.com/Dane-22/jajr_facial_recognition.git
cd jajr_facial_recognition
```

## Step 2: Backend Setup

### 2.1 Install Backend Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 2.2 Setup MySQL Database

1. **Open MySQL Workbench or Command Line**
2. **Create a new database** named `face_recognition_db`:

```sql
CREATE DATABASE face_recognition_db;
USE face_recognition_db;
```

3. **Run the database setup script**:

```bash
# Option 1: Using MySQL Command Line
mysql -u root -p < database.sql

# Option 2: Using MySQL Workbench
# Open database.sql file in MySQL Workbench and execute it
```

4. **Verify tables were created**:
```sql
SHOW TABLES;
-- You should see: admins, users, attendance
```

### 2.3 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
```

Create `.env` file with the following content:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=face_recognition_db
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

**Important:** Replace `your_mysql_password` with your actual MySQL password and `your_jwt_secret_key_here` with a secure random string.

### 2.4 Seed Admin User

Run the admin seeding script to create the default admin account:

```bash
node seedAdmin.js
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `password123`

**⚠️ Security Note:** Change the default password after first login!

### 2.5 Start the Backend Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5000`

## Step 3: Frontend Setup

### 3.1 Install Frontend Dependencies

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

### 3.2 Start the Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is occupied)

## Step 4: Access the Application

### Main Application
- Open your browser and navigate to: `http://localhost:5173`
- This is the face recognition attendance scanning interface

### Admin Portal
- Navigate to: `http://localhost:5173/admin/login`
- Login with default credentials:
  - Username: `admin`
  - Password: `password123`

## Step 5: Camera Permissions

When you first access the application:
1. Allow camera permissions when prompted by your browser
2. Ensure your device has a working webcam
3. Make sure you're in a well-lit area for accurate face detection

## Project Structure

```
jajr_facial_recognition/
├── backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── attendanceController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT authentication
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── userRoutes.js
│   ├── .env                   # Environment variables (create this)
│   ├── database.sql           # Database schema
│   ├── seedAdmin.js           # Admin user seeding
│   ├── server.js              # Express server
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── models/            # Face-api models (optional local storage)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AttendanceAudit.jsx
│   │   │   ├── AttendanceCard.jsx
│   │   │   ├── CameraFeed.jsx
│   │   │   ├── DailyLogs.jsx
│   │   │   ├── RegisterFace.jsx
│   │   │   └── UI/
│   │   │       ├── StatCard.jsx
│   │   │       └── Table.jsx
│   │   ├── utils/
│   │   │   └── faceApiLoader.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── FACIAL_RECOGNITION_LIBRARIES.md  # Documentation
└── README.md
```

## Troubleshooting

### Backend Issues

**Problem: Cannot connect to MySQL**
- Solution: Check your MySQL credentials in `.env` file
- Ensure MySQL service is running
- Verify database name matches in `.env`

**Problem: Port 5000 already in use**
- Solution: Change the `PORT` in `.env` file to another port (e.g., 5001)
- Update frontend API URL in `frontend/src/utils/faceApiLoader.js` and other components

### Frontend Issues

**Problem: Face-api models not loading**
- Solution: Check your internet connection (models load from CDN)
- If offline, download models locally and update `MODEL_URL` in `faceApiLoader.js`

**Problem: Camera not working**
- Solution: Ensure browser has camera permissions
- Check if another application is using the camera
- Try a different browser (Chrome recommended)

**Problem: CORS errors**
- Solution: Ensure backend is running on port 5000
- Check CORS configuration in `backend/server.js`

### Database Issues

**Problem: Database connection failed**
- Solution: Verify MySQL is running
- Check credentials in `.env` file
- Ensure database `face_recognition_db` exists

**Problem: Tables not found**
- Solution: Run `database.sql` script again
- Check for any SQL errors in the script execution

## Development vs Production

### Development Setup
- Use `npm run dev` for both frontend and backend
- Hot-reloading enabled
- Debug mode active

### Production Setup

**Backend:**
```bash
cd backend
npm install --production
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server like nginx or serve
```

## Security Considerations

1. **Change Default Passwords**: Change the default admin password immediately
2. **Environment Variables**: Never commit `.env` file to version control
3. **JWT Secret**: Use a strong, random JWT secret key
4. **Database Password**: Use a strong MySQL password
5. **HTTPS**: Use HTTPS in production for secure communication
6. **Camera Permissions**: Ensure proper authentication for camera access

## Additional Resources

- **face-api.js Documentation**: https://github.com/justadudewhohacks/face-api.js
- **React Documentation**: https://react.dev/
- **Express Documentation**: https://expressjs.com/
- **MySQL Documentation**: https://dev.mysql.com/doc/

## Support

If you encounter issues not covered in this guide:
1. Check the browser console for error messages
2. Check the terminal/console where the backend is running
3. Review the FACIAL_RECOGNITION_LIBRARIES.md for technical details
4. Check GitHub issues for similar problems

## Quick Start Summary

```bash
# Clone repository
git clone https://github.com/Dane-22/jajr_facial_recognition.git
cd jajr_facial_recognition

# Backend setup
cd backend
npm install
# Create .env file with your MySQL credentials
mysql -u root -p < database.sql
node seedAdmin.js
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# Access application
# Frontend: http://localhost:5173
# Admin: http://localhost:5173/admin/login
```

## Important Notes

- **Backend runs on port 5000** by default
- **Frontend runs on port 5173** by default (Vite default)
- **Face-api models load from CDN** - internet connection required for first load
- **Camera permissions** must be granted in the browser
- **Good lighting** is essential for accurate face recognition
- **Default admin**: `admin` / `password123` (change this!)
