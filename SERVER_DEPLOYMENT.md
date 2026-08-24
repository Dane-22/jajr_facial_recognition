# JAJR Facial Recognition - System Deployment & Docker Operations Manual

---

## 1. System Architecture & Topology

**JAJR Facial Recognition** is structured as a multi-tier microservice architecture orchestrated via Docker Compose:

```text
                                  [ Client Browser ]
                                          |
                                          |  HTTP:80 / HTTPS:443
                                          v
+---------------------------------------------------------------------------------------+
|  HOST SERVER (Nginx Reverse Proxy)                                                    |
|                                                                                       |
|  - Routes attendance.yourdomain.com -> localhost:7001                                 |
|  - Manages Let's Encrypt SSL Certificates for secure camera access                    |
+-----------------------------------+---------------------------------------------------+
                                    |
                                    v
+---------------------------------------------------------------------------------------+
|  FRONTEND CONTAINER (Nginx Alpine Web Server)           [Port: 7001]                  |
|                                                                                       |
|  - Serves compiled React SPA bundle                                                   |
|  - Handles SPA client-side routing fallback                                           |
|  - Requests camera permissions (requires HTTPS)                                       |
+-----------------------------------+---------------------------------------------------+
                                    |
          Internal Docker Network   | (jajr_network)
                                    v
+---------------------------------------------------------------------------------------+
|  BACKEND CONTAINER (Node.js + Express)                  [Port: 7000]                  |
|                                                                                       |
|  - REST API Engine & Face Recognition Processing                                      |
|  - Connects to isolated MySQL and Redis containers                                    |
+-------------------+-----------------------------------------------+-------------------+
                    |                                               |
                    v                                               v
+---------------------------------------+       +---------------------------------------+
|  MYSQL CONTAINER (MySQL 8.0)          |       |  REDIS CONTAINER (Redis Alpine)       |
|                                       |       |                                       |
|  - Persistent Volume: db_data         |       |  - High-throughput In-Memory Cache    |
|  - Internal Hostname: jajr_db         |       |  - Internal Hostname: jajr_redis      |
|  - Database: facial_attendance_db     |       |                                       |
+---------------------------------------+       +---------------------------------------+
```

---

## 2. Server Prerequisites & Specifications

### Recommended Hardware
| Resource | Minimum | Recommended (Production) |
| :--- | :--- | :--- |
| **CPU** | 1 vCPU (2.0 GHz+) | 2+ vCPUs |
| **RAM** | 2 GB | 4 GB+ |
| **Storage** | 20 GB SSD | 30+ GB SSD |

### Operating System Support
- **Ubuntu 24.04 LTS / 22.04 LTS** *(Highly Recommended)*
- Debian 11/12

---

## 3. Server Preparation (Ubuntu)

Log in to your server via SSH:
```bash
ssh root@[IP_ADDRESS]
```

### Step 3.1: Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3.2: Install Docker Engine
```bash
# Install Docker and Compose Plugin
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Application Deployment Workflow

### Step 4.1: Clone the Repository
```bash
# Clone the repository to your home directory (or /var/www/)
git clone https://github.com/Dane-22/jajr_facial_recognition.git
cd jajr_facial_recognition
```

### Step 4.2: Configure Environment Variables
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Ensure you set your database passwords and API keys correctly.

### Step 4.3: Build & Start Containers
Run the cluster in detached mode. This will safely build the React frontend and Node backend.
```bash
docker compose up -d --build
```
Verify they are running: `docker compose ps`

---

## 5. Database Initialization

When the MySQL container (`jajr_db`) starts for the first time, it is empty. Import your `.sql` backup file.

Run this command to temporarily disable foreign key checks and pipe the SQL file directly into the running database container (replace the password with your actual root password):

```bash
(echo "SET FOREIGN_KEY_CHECKS=0;" ; cat backend/facial_attendance_db.sql ; echo "SET FOREIGN_KEY_CHECKS=1;") | sudo docker exec -i jajr_db mysql -u root -pJaJr12390786@ facial_attendance_db
```

---

## 6. Nginx Configuration (Host Reverse Proxy)

Since the Dockerized frontend is running on **Port 7001**, configure your host server's Nginx to reverse proxy your public domain to this port.

**1. Create the Nginx configuration file:**
```bash
sudo tee /etc/nginx/sites-available/jajr_attendance > /dev/null << 'EOF'
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
EOF
```

**2. Enable the site and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/jajr_attendance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. SSL/HTTPS Setup (Crucial)

> [!WARNING]
> **CRITICAL REQUIREMENT:** The HTML5 Geolocation API and WebRTC Camera APIs (used by Face-API.js) **will not work** in modern browsers unless the site is served over a secure HTTPS connection.

Secure your domain using a free Let's Encrypt SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d attendance.yourdomain.com
```
Follow the prompts to automatically redirect all HTTP traffic to HTTPS.

---

## 8. Continuous Deployment Workflow (Pushing Updates)

When you make changes to your code locally and want to update the production server, follow this standard Git deployment workflow:

**1. On your local machine (Push to GitHub):**
```bash
git add .
git commit -m "Describe your updates here"
git push origin main
```

**2. On your production server (Pull & Rebuild):**
```bash
# SSH into the server
ssh root@[IP_ADDRESS]

# Navigate to the project directory
cd ~/jajr_facial_recognition

# Pull the latest changes from GitHub
git pull origin main

# Rebuild and restart the containers in the background
docker compose up -d --build
```
> [!TIP]
> Docker is smart enough to only rebuild the parts of the application that have changed, and it will do so without interrupting or clearing your database.

---

## 9. Helpful Docker Commands

| Command | Description |
| :--- | :--- |
| `docker compose logs -f` | View logs for all containers in real-time |
| `docker compose logs -f backend` | View logs for the backend container only |
| `docker compose down` | Stop and remove the application containers |
| `docker compose up -d --build` | Rebuild and start the application |
