# 🚀 SSH Production Deployment Plan: Facial Recognition Attendance System

This document outlines the step-by-step procedure to deploy the **Facial Recognition Attendance System** (Node.js/Express Backend + React/Vite Frontend + MySQL Database) to a Linux Virtual Private Server (VPS) such as Ubuntu 20.04 / 22.04 / 24.04 LTS using SSH, Nginx, PM2, and Let's Encrypt SSL.

---

## ⚠️ CRITICAL DEPLOYMENT REQUIREMENTS

> [!IMPORTANT]
> **HTTPS (SSL Certificate) is MANDATORY for Camera Access**  
> Web browsers (Chrome, Safari, Firefox, Edge) enforce strict origin security (`navigator.mediaDevices.getUserMedia`). **Webcams will NOT function over insecure `http://` connections** on public domains. You **must** configure HTTPS using Certbot/Let's Encrypt as detailed in Phase 6.

---

## 🏗️ System Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │              Client Browser             │
                        └────────────────────┬────────────────────┘
                                             │ HTTPS (Port 443)
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │               Nginx Server              │
                        └─────────┬───────────────────┬───────────┘
                                  │                   │
                  Static Dist Files                   │ Reverse Proxy
         (/var/www/face_recog/frontend/dist)          │ (/api, /socket.io, /uploads)
                                  │                   ▼
                                  │         ┌───────────────────┐
                                  │         │ Express Backend   │
                                  │         │ (PM2 / Port 5000) │
                                  │         └─────────┬─────────┘
                                  │                   │
                                  │         ┌─────────┴─────────┐
                                  │         │                   │
                                  ▼         ▼                   ▼
                           ┌──────────────┐  ┌───────────────┐ ┌─────────┐
                           │ face-api.js  │  │ MySQL Database│ │  Redis  │
                           │ Models Folder│  │  (Port 3306)  │ │ (Cache) │
                           └──────────────┘  └───────────────┘ └─────────┘
```

---

## 🛠️ Step-by-Step Deployment Guide

### Phase 1: Connect to Server & Install Dependencies

1. **Connect to your Linux VPS via SSH:**
   ```bash
   ssh root@<YOUR_SERVER_IP>
   ```

2. **Update system packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install Node.js 20 LTS, Nginx, MySQL, Git, & Curl:**
   ```bash
   # Add NodeSource repository for Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   
   # Install required packages
   sudo apt install -y nodejs nginx mysql-server git build-essential redis-server
   ```

4. **Install PM2 globally for process management:**
   ```bash
   sudo npm install -g pm2
   ```

5. **Install Certbot for free SSL certificates:**
   ```bash
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

---

### Phase 2: Database Setup (MySQL)

1. **Secure MySQL Installation:**
   ```bash
   sudo mysql_secure_installation
   ```
   *(Follow prompts to set up secure root options).*

2. **Create Database & Dedicated Database User:**
   Log into MySQL terminal:
   ```bash
   sudo mysql -u root -p
   ```

   Execute the following SQL commands:
   ```sql
   CREATE DATABASE facial_attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   CREATE USER 'face_user'@'localhost' IDENTIFIED BY 'ReplaceWithYourStrongPassword123!';
   
   GRANT ALL PRIVILEGES ON facial_attendance_db.* TO 'face_user'@'localhost';
   
   FLUSH PRIVILEGES;
   EXIT;
   ```

---

### Phase 3: Clone Repository & Setup Backend

1. **Create Web Root Directory & Clone Repo:**
   ```bash
   sudo mkdir -p /var/www/face_recog
   sudo chown -R $USER:$USER /var/www/face_recog
   
   git clone https://github.com/Dane-22/jajr_facial_recognition.git /var/www/face_recog
   ```

2. **Configure Backend Environment Variables:**
   Navigate to backend directory:
   ```bash
   cd /var/www/face_recog/backend
   npm install --production
   ```

   Create production `.env` file:
   ```bash
   nano .env
   ```

   Paste the following production configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=face_user
   DB_PASSWORD=ReplaceWithYourStrongPassword123!
   DB_NAME=facial_attendance_db
   DB_CONNECTION_LIMIT=10
   DB_QUEUE_LIMIT=0
   DB_WAIT_FOR_CONNECTIONS=true

   # Server Configuration
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://yourdomain.com

   # Security
   JWT_SECRET=MakeSureThisIsALongRandomSecretStringString987654321

   # Redis Configuration
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   CACHE_TTL_SECONDS=300
   ```

3. **Import Database Tables & Migration:**
   ```bash
   # Import main schema
   mysql -u face_user -p'ReplaceWithYourStrongPassword123!' facial_attendance_db < /var/www/face_recog/backend/facial_attendance_db.sql

   # Import chat system migrations
   mysql -u face_user -p'ReplaceWithYourStrongPassword123!' facial_attendance_db < /var/www/face_recog/backend/migrations/create_chat_tables.sql
   ```

4. **Seed Default Admin User:**
   ```bash
   node seedAdmin.js
   ```
   *(Default Admin created: Username `admin` | Password `password123`)*

5. **Ensure Upload Directory Permissions:**
   ```bash
   mkdir -p uploads/chat
   chmod -R 775 uploads
   ```

---

### Phase 4: Backend Process Management (PM2)

1. **Start Express Backend with PM2:**
   ```bash
   cd /var/www/face_recog/backend
   pm2 start server.js --name "face-backend"
   ```

2. **Configure PM2 to Start Automatically on System Reboot:**
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Copy and paste the output command generated by `pm2 startup` into your shell if prompted).*

---

### Phase 5: Build Frontend (React / Vite)

1. **Install Frontend Dependencies & Build:**
   ```bash
   cd /var/www/face_recog/frontend
   npm install
   ```

2. **Build Production Assets:**
   ```bash
   npm run build
   ```
   *The production build output will be located in `/var/www/face_recog/frontend/dist`.*

---

### Phase 6: Configure Nginx Reverse Proxy & SSL

1. **Create Nginx Site Configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/face_recog
   ```

2. **Paste the following Nginx configuration:**
   *(Replace `yourdomain.com` with your actual domain or server IP).*

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       root /var/www/face_recog/frontend/dist;
       index index.html;

       # Max upload file size for chat attachments / profile photos
       client_max_body_size 15M;

       # Gzip Compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

       # Security Headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header X-Content-Type-Options "nosniff" always;

       # Single Page Application (SPA) Routing Fallback
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy API Endpoints to Node Express Backend
       location /api/ {
           proxy_pass http://127.0.0.1:5000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Proxy Socket.IO Real-Time Connections
       location /socket.io/ {
           proxy_pass http://127.0.0.1:5000/socket.io/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Serve Uploaded Files Directly
       location /uploads/ {
           alias /var/www/face_recog/backend/uploads/;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }

       # Cache Static Assets (JS, CSS, Images, Models)
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|json|bin)$ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

3. **Enable Configuration & Test Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/face_recog /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Obtain SSL Certificate (HTTPS) via Certbot:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
   *(Follow the prompts to enable HTTPS redirect).*

---

### Phase 7: Firewall & Security Configuration

1. **Configure UFW Firewall:**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

---

## 🔁 Rapid Deployment Update Script (For Future Updates)

When pushing new code updates to GitHub, log into SSH and run this quick script to pull and deploy changes:

```bash
cd /var/www/face_recog
git pull origin master

# Update Backend
cd /var/www/face_recog/backend
npm install --production
pm2 restart face-backend

# Rebuild Frontend
cd /var/www/face_recog/frontend
npm install
npm run build

echo "✅ App update deployed successfully!"
```

---

## 🔍 Useful Diagnostic & Monitoring Commands

- **Check PM2 Status:** `pm2 status`
- **View Realtime Backend Logs:** `pm2 logs face-backend`
- **Restart Backend Service:** `pm2 restart face-backend`
- **Check Nginx Logs:** `sudo tail -f /var/log/nginx/error.log`
- **Test Nginx Syntax:** `sudo nginx -t`
- **Restart Nginx:** `sudo systemctl restart nginx`
- **Check MySQL Status:** `sudo systemctl status mysql`
