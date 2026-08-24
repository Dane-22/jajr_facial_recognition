# JAJR Facial Recognition System - Docker Deployment Guide

This guide provides step-by-step instructions for deploying the JAJR Facial Recognition Attendance System to a production server using **Docker Compose**. 

Using Docker is the safest and most reliable way to deploy the application on a shared production server, as it runs the Frontend (Nginx), Backend (Node.js), Database (MySQL), and Cache (Redis) in completely isolated containers.

---

## 1. Server Prerequisites
Ensure your production server (Ubuntu/Debian recommended) has Docker and Docker Compose installed.

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 2. Transferring the Project
You must securely transfer your project files from your local machine to the production server.

1. Open a **local** terminal (e.g., PowerShell on Windows) and use SCP:
   ```powershell
   scp -r c:\wamp64\www\jajr_facial_recognition root@[IP_ADDRESS]:/var/www/
   ```

2. SSH into your production server and navigate to the project directory:
   ```bash
   ssh root@[IP_ADDRESS]
   cd /var/www/jajr_facial_recognition
   ```

---

## 3. Starting the Application
The `docker-compose.yml` file defines all 4 services. The backend will be exposed on **Port 7000** and the frontend on **Port 7001**. The MySQL and Redis databases are strictly internal and will not conflict with your server's existing databases.

To build the images and start the cluster in the background, run:
```bash
docker compose up -d --build
```
*Note: This will take a few minutes as it downloads the base images and builds the React frontend.*

To check if all containers are running successfully:
```bash
docker compose ps
```

---

## 4. Importing the Database
When the MySQL container (`jajr_db`) starts for the first time, it is empty. You need to import your `.sql` backup file.

Assuming your backup file is located at `backend/facial_attendance_db.sql`, run this command to pipe the SQL file directly into the running database container:

```bash
cat backend/facial_attendance_db.sql | docker exec -i jajr_db mysql -u root -pRoot_Secure_Pass2026! jajr_attendance
```

---

## 5. Nginx Configuration (Host Reverse Proxy)
Since the Dockerized frontend is running on **Port 7001**, you should configure your host server's Nginx to reverse proxy your public domain (e.g., `attendance.yourdomain.com`) to this port.

1. Create a new Nginx configuration file on the host:
   ```bash
   sudo nano /etc/nginx/sites-available/jajr_attendance
   ```
2. Paste the following configuration (replace `yourdomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name attendance.yourdomain.com;

       location / {
           proxy_pass http://localhost:7001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
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
sudo certbot --nginx -d attendance.yourdomain.com
```
Follow the prompts to automatically redirect all HTTP traffic to HTTPS.

---

## 7. Helpful Docker Commands

- **View Logs (All containers):**
  ```bash
  docker compose logs -f
  ```
- **View Logs (Backend only):**
  ```bash
  docker compose logs -f backend
  ```
- **Stop the application:**
  ```bash
  docker compose down
  ```
- **Restart the application (e.g., after a code change):**
  ```bash
  docker compose up -d --build
  ```
