# ENG PLANNER - System Deployment & Docker Operations Manual

---

## 1. System Architecture & Topology

**ENG PLANNER** is structured as an enterprise multi-tier microservice architecture orchestrated via Docker Compose:

```
                                  [ Client Browser ]
                                          |
                                          |  HTTP:80 / HTTPS:443
                                          v
+---------------------------------------------------------------------------------------+
|  FRONTEND CONTAINER (Nginx Alpine Reverse Proxy & Web Server)                          |
|                                                                                       |
|  - Serves compiled React 18 + Vite SPA bundle (/usr/share/nginx/html)                 |
|  - Handles SPA client-side routing fallback (try_files $uri $uri/ /index.html)        |
|  - Caches static CSS/JS/SVG assets with gzip compression                              |
|  - Allows CAD blueprint uploads up to 500MB (client_max_body_size 500M)                |
+-----------------------------------+---------------------------------------------------+
                                    |
          Internal Docker Network   | (eng_network)
                                    v
+---------------------------------------------------------------------------------------+
|  BACKEND CONTAINER (Node.js 20 + Express + Socket.io + Prisma Engine)                 |
|                                                                                       |
|  - REST API Engine mounted at /api/v1                                                 |
|  - Real-Time Collaborative Canvas & Messenger (WebSocket /socket.io/)                 |
|  - CAD Parsing & Vectorization Engine (DXF / DWG / PDF)                               |
|  - EngiAI Copilot Integration                                                         |
+-------------------+-----------------------------------------------+-------------------+
                    |                                               |
                    v                                               v
+---------------------------------------+       +---------------------------------------+
|  MYSQL CONTAINER (MySQL 8.0)          |       |  REDIS CONTAINER (Redis 7 Alpine)     |
|                                       |       |                                       |
|  - Relational Database Engine         |       |  - High-throughput In-Memory Cache    |
|  - Character Set: utf8mb4_unicode_ci  |       |  - Real-time Pub/Sub Collaboration    |
|  - Persistent Volume: mysql_data      |       |  - Persistent Volume: redis_data      |
|  - Auto-seeded via eng_planner.sql    |       +---------------------------------------+
+---------------------------------------+
```

---

## 2. Server Prerequisites & Specifications

### Hardware Requirements
| Resource | Minimum | Recommended (Production) |
| :--- | :--- | :--- |
| **CPU** | 1 vCPU (2.0 GHz+) | 2+ vCPUs |
| **RAM** | 2 GB | 4 GB - 8 GB |
| **Storage** | 20 GB SSD | 50+ GB SSD (for CAD drawings & DB) |
| **Network** | 100 Mbps | 1 Gbps |

### Operating System Support
- **Ubuntu 24.04 LTS / 22.04 LTS / 20.04 LTS (x86_64 or ARM64)** *(Target server: Ubuntu 24.04.4 LTS)*
- Debian 11/12
- Red Hat Enterprise Linux (RHEL) / AlmaLinux / Rocky Linux 9
- Windows 10/11 with Docker Desktop & WSL2

---

## 3. Server Preparation (Ubuntu 24.04 LTS)

Log in to your server via SSH:
```bash
ssh root@72.62.254.60
```

### Step 3.1: Update System Packages
```bash
apt update && apt upgrade -y
```

### Step 3.2: Install Docker Engine & Docker Compose Plugin
```bash
# 1. Install prerequisites
apt install -y ca-certificates curl gnupg lsb-release git ufw

# 2. Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# 3. Add the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Enable and start Docker service
systemctl enable docker
systemctl start docker

# 6. Verify installation
docker --version
docker compose version
```

### Step 3.3: Configure Server Firewall (UFW)
Ensure essential ports are open and internal ports are protected:
```bash
# Allow SSH (CRITICAL: Do not lock yourself out)
ufw allow 22/tcp

# Allow HTTP & HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable Firewall
ufw --force enable
ufw status
```

---

## 4. Application Deployment Workflow

### Step 4.1: Clone or Copy the Repository
```bash
mkdir -p /var/www
cd /var/www

# Clone your project repository
git clone https://github.com/Dane-22/sketchpad.git eng_planner
# OR transfer your project folder directly
cd /var/www/eng_planner
```

### Step 4.2: Configure Environment Variables
Create the production `.env` configuration file:
```bash
cp .env.docker.example .env
```

Edit `.env` using `nano .env` and update the security keys:
```env
NODE_ENV=production
PORT=5005

# MySQL Database Configuration
MYSQL_ROOT_PASSWORD=YOUR_STRONG_ROOT_PASSWORD_HERE
MYSQL_DATABASE=eng_planner
MYSQL_USER=eng_user
MYSQL_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
MYSQL_HOST=mysql
MYSQL_PORT=3306

DATABASE_URL=mysql://eng_user:YOUR_STRONG_DB_PASSWORD_HERE@mysql:3306/eng_planner

# Host Port Mappings
HOST_HTTP_PORT=80
HOST_DB_PORT=3306

# Redis Cache
REDIS_URL=redis://redis:6379

# JWT Secret (Generate a strong 64-char key)
JWT_SECRET=super_secure_production_jwt_secret_key_8492049182390123
JWT_EXPIRES_IN=7d

# Optional AI Engineering Copilot Key
GEMINI_API_KEY=
```

> [!TIP]
> To generate a secure random string on Linux, run:
> ```bash
> openssl rand -base64 32
> ```

---

### Step 4.3: Launch Containers
Build and run the entire stack in detached mode:
```bash
docker compose up -d --build
```

### Step 4.4: Verify Container Health
Check the status of running containers:
```bash
docker compose ps
```
You should see all 4 services up and healthy:
```
NAME                   IMAGE                  COMMAND                  SERVICE    CREATED          STATUS                    PORTS
eng_planner_backend    eng_planner-backend    "./docker-entrypoint…"   backend    10 seconds ago   Up 9 seconds              5005/tcp
eng_planner_frontend   eng_planner-frontend   "/docker-entrypoint.…"   frontend   10 seconds ago   Up 9 seconds              0.0.0.0:80->80/tcp
eng_planner_mysql      mysql:8.0              "docker-entrypoint.s…"   mysql      10 seconds ago   Up 10 seconds (healthy)   0.0.0.0:3306->3306/tcp
eng_planner_redis      redis:7-alpine         "docker-entrypoint.s…"   redis      10 seconds ago   Up 10 seconds (healthy)   6379/tcp
```

View real-time aggregated logs:
```bash
docker compose logs -f
```

---

## 5. Database Management & Restores

### Automatic Bootstrapping
On the first container initialization, MySQL automatically executes `./eng_planner.sql` (mounted into `/docker-entrypoint-initdb.d/01_init.sql`).

### Manual Database Import / Restore
If you need to restore or import a new database dump at any time:
```bash
docker compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} eng_planner < eng_planner.sql
```

### Exporting / Creating Live Backups
To create an on-demand backup of the database:
```bash
docker compose exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} eng_planner > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Synchronizing Prisma Schema
If you update `schema.prisma`, sync the database tables without losing data:
```bash
docker compose exec backend npx prisma db push
```

---

## 6. Domain & SSL/TLS Configuration (HTTPS)

To secure your production deployment with free Let's Encrypt SSL certificates:

### Option A: Using Certbot & Host Nginx (Recommended for Single Domain)

1. Install host Nginx and Certbot:
```bash
apt install -y nginx certbot python3-certbot-nginx
```

2. Change `HOST_HTTP_PORT` in `.env` to avoid port 80 conflict:
```env
HOST_HTTP_PORT=8080
```
Restart docker compose:
```bash
docker compose up -d --force-recreate frontend
```

3. Create Nginx virtual host configuration: `/etc/nginx/sites-available/engplanner.conf`
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

4. Enable site and issue SSL certificate:
```bash
ln -s /etc/nginx/sites-available/engplanner.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 7. Systemd Service (Auto-Start on Boot)

Ensure the ENG PLANNER application automatically boots if the VPS restarts:

Create `/etc/systemd/system/eng-planner.service`:
```ini
[Unit]
Description=ENG PLANNER Container Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/eng_planner
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
systemctl daemon-reload
systemctl enable eng-planner.service
```

---

## 8. Continuous Updates & Deployment (From `git add` to Production)

Follow this complete lifecycle whenever you make code changes locally and want to deploy them to the live production server:

```
[Local PC: Windows]
  1. Modify files & test
  2. git add .
  3. git commit -m "your message"
  4. git push origin main
              │
              ▼ (GitHub Repository)
              │
[Remote Server: Ubuntu 72.62.254.60]
  5. cd /var/www/eng_planner
  6. git fetch origin main
  7. git pull origin main
  8. docker compose up -d --build
  9. docker compose ps (Verify)
```

### Phase A: On Your Local PC (Windows)
```bash
# 1. Stage all your changes
git add .

# 2. Commit with a descriptive message
git commit -m "feat: added new features"

# 3. Push changes to GitHub
git push origin main
```

---

### Phase B: On Your Production Server (`root@72.62.254.60`)
SSH into your server and run:

```bash
# 1. Navigate to the project directory
cd /var/www/eng_planner

# 2. Fetch the latest branch information
git fetch origin main

# 3. Pull the new commits
git pull origin main

# 4. Rebuild updated containers and restart seamlessly
docker compose up -d --build

# 5. Verify all containers are running
docker compose ps
```

---

### Phase C: Special Scenarios During Updates

#### 1. If You Changed Database Models (`schema.prisma`):
```bash
docker compose exec backend npx prisma db push
```

#### 2. If You Updated Frontend Only (Fast Rebuild):
```bash
docker compose up -d --build frontend
```

#### 3. If You Updated Backend Only (Fast Rebuild):
```bash
docker compose up -d --build backend
```

#### 4. Clean Up Old Build Images (Freeing Disk Space):
```bash
docker image prune -f
```

---

## 9. Monitoring, Logs & Troubleshooting

### Viewing Service Logs
```bash
# View all logs
docker compose logs -f

# View only backend logs
docker compose logs -f backend

# View only frontend (Nginx) logs
docker compose logs -f frontend

# View only MySQL logs
docker compose logs -f mysql
```

### Interactive Shell Access
```bash
# Open shell inside backend container
docker compose exec backend sh

# Open MySQL shell
docker compose exec mysql mysql -u eng_user -p eng_planner
```

### Common Issues & Quick Solutions

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Port 80 already in use** | Apache or default Nginx running on host | Run `systemctl stop apache2 && systemctl disable apache2` or change `HOST_HTTP_PORT=8080` in `.env`. |
| **Database Connection Timed Out** | MySQL still initializing tables | The `docker-entrypoint.sh` automatically retries up to 60 times. Check `docker compose logs -f mysql`. |
| **Large CAD File Upload 413 Payload Too Large** | Nginx body limit exceeded | Both `frontend/nginx.conf` and `docker-compose.yml` are set to `500M`. Verify file size is under 500MB. |
| **WebSocket Connection Failed** | Missing Upgrade headers | Nginx is pre-configured with `proxy_set_header Upgrade $http_upgrade;`. Ensure reverse proxy / Cloudflare has WebSockets enabled. |
| **Prisma Engine Binary Error** | Architecture mismatch | Multi-stage Dockerfile generates Prisma engine inside Alpine (`node:20-alpine`) natively. Always build via `docker compose build`. |

---

## 10. Summary of Key Files

- [docker-compose.yml](file:///c:/wamp64/www/eng_planner/docker-compose.yml): Production container orchestration stack.
- [docker-compose.dev.yml](file:///c:/wamp64/www/eng_planner/docker-compose.dev.yml): Development hot-reloading override.
- [backend/Dockerfile](file:///c:/wamp64/www/eng_planner/backend/Dockerfile): Multi-stage Node.js + Prisma build.
- [backend/docker-entrypoint.sh](file:///c:/wamp64/www/eng_planner/backend/docker-entrypoint.sh): Automated DB health check & Prisma sync.
- [frontend/Dockerfile](file:///c:/wamp64/www/eng_planner/frontend/Dockerfile): Multi-stage React Vite build with Nginx Alpine.
- [frontend/nginx.conf](file:///c:/wamp64/www/eng_planner/frontend/nginx.conf): Reverse proxy, SPA routing & WebSocket proxy.
- [.env.docker.example](file:///c:/wamp64/www/eng_planner/.env.docker.example): Production environment variable template.
