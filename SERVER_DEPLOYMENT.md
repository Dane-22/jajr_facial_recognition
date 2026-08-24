# JAJR Facial Recognition System - Server Deployment Guide

This guide provides step-by-step instructions for deploying the JAJR Facial Recognition Attendance System to a production server. 

We recommend deploying to a Linux (Ubuntu 22.04 LTS or newer) Virtual Private Server (VPS) such as DigitalOcean, AWS EC2, or Linode for optimal performance, stability, and security.

---

## 1. Prerequisites
Ensure your production server has the following software installed:
- **Node.js** (v18.x or v20.x recommended)
- **MySQL Server** (v8.0)
- **Redis Server** (for caching)
- **Nginx** (as a reverse proxy)
- **PM2** (for managing the Node.js backend daemon)
- **Git** (for cloning the repository)

You can install all prerequisites on Ubuntu with the following commands:
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js, NPM, Git, Redis, and Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git redis-server nginx

# Install PM2 globally
sudo npm install -g pm2

# Install MySQL
sudo apt install -y mysql-server
```

---

## 2. Database Setup
1. Log in to your MySQL server:
   ```bash
   sudo mysql -u root -p
   ```
2. Create the production database and user:
   ```sql
   CREATE DATABASE jajr_attendance;
   CREATE USER 'jajr_admin'@'localhost' IDENTIFIED BY 'Strong_Password_Here';
   GRANT ALL PRIVILEGES ON jajr_attendance.* TO 'jajr_admin'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Import your database schema and seed data (ensure you exported it using the Admin Dashboard feature):
   ```bash
   mysql -u jajr_admin -p jajr_attendance < /path/to/your/backup.sql
   ```

---

## 3. Backend Deployment (Node.js/Express)
The backend acts as the REST API and WebSocket server.

1. Navigate to your desired installation directory (e.g., `/var/www/`):
   ```bash
   cd /var/www/jajr_facial_recognition/backend
   ```
2. Install production dependencies:
   ```bash
   npm install --omit=dev
   ```
3. Create the production `.env` file:
   ```bash
   nano .env
   ```
   Add the following environment variables (modify according to your setup):
   ```env
   NODE_ENV=production
   PORT=5000

   # Database Configuration
   DB_HOST=localhost
   DB_USER=jajr_admin
   DB_PASSWORD=Strong_Password_Here
   DB_NAME=jajr_attendance

   # Redis Configuration
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   
   # Security
   JWT_SECRET=your_super_secret_jwt_key
   KIOSK_API_KEY=your_kiosk_secret_key
   ```
4. Start the backend using PM2 to ensure it runs continuously in the background and restarts on server reboots:
   ```bash
   pm2 start index.js --name "jajr-backend"
   pm2 save
   pm2 startup
   ```

---

## 4. Frontend Deployment (React/Vite)
The frontend must be compiled into static HTML/JS/CSS files, which will be served directly by Nginx.

1. Navigate to the frontend directory:
   ```bash
   cd /var/www/jajr_facial_recognition/frontend
   ```
2. Install all dependencies (including devDependencies needed for building):
   ```bash
   npm install
   ```
3. Create the production `.env` file:
   ```bash
   nano .env.production
   ```
   Add the following variables. Ensure the URL points to your actual production domain or public IP:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api
   VITE_KIOSK_API_KEY=your_kiosk_secret_key
   ```
4. Build the frontend for production:
   ```bash
   npm run build
   ```
   *This command creates a `dist` folder containing the optimized static assets, including the Face-API models.*

---

## 5. Nginx Configuration (Reverse Proxy)
Nginx will serve the static frontend files and proxy API requests to your Node.js backend.

1. Create a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/jajr_attendance
   ```
2. Paste the following configuration (replace `yourdomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com api.yourdomain.com;

       # Route to Backend API
       location /api/ {
           proxy_pass http://localhost:5000/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Socket.IO Routing for Real-time Dashboard Updates
       location /socket.io/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }

       # Route to Frontend Static Files
       location / {
           root /var/www/jajr_facial_recognition/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html; # Required for React Router
       }
   }
   ```
3. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/jajr_attendance /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 6. SSL/HTTPS Setup (Crucial)
**CRITICAL REQUIREMENT:** The HTML5 Geolocation API and WebRTC Camera APIs (used by Face-API.js) **will not work** in modern browsers unless the site is served over a secure HTTPS connection.

You must secure your domain using a free Let's Encrypt SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```
Follow the prompts to automatically redirect all HTTP traffic to HTTPS.

---

## 7. Post-Deployment Verification
Once deployed, perform the following tests:
1. Navigate to `https://yourdomain.com` and log in as an Admin.
2. Go to **Settings -> Geolocation & Geofencing** and update your Office Location to match the physical location of the server's target audience.
3. Access the Kiosk view and verify that the webcam initializes successfully (HTTPS required).
4. Perform a test check-in using facial recognition and verify that the real-time websocket pushes the data to the Admin Dashboard instantly.
5. Check that the PM2 logs are error-free: `pm2 logs jajr-backend`.
