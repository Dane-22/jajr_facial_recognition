# Facial Recognition Attendance System - Phase 2 to Phase 5 Plan

## Overview
This document outlines the implementation plan for Phase 2 (Security), Phase 3 (Performance & Scalability), Phase 4 (Mobile & UX), and Phase 5 (DevOps & Deployment) of the Facial Recognition Attendance System.

---

## Phase 2: Security Enhancements

### Week 2.1: Two-Factor Authentication (TOTP, QR Codes, Backup Codes)

**Status:** Deferred - Will return after Phase 3

**Implementation Details:**

**Dependencies:**
- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation for easy setup

**Database Changes:**
```sql
ALTER TABLE admins ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE admins ADD COLUMN backup_codes JSON;
```

**Backend Endpoints:**
1. `POST /api/admin/2fa/setup` - Generate TOTP secret and QR code
2. `POST /api/admin/2fa/verify` - Verify TOTP code during setup
3. `POST /api/admin/2fa/enable` - Enable 2FA after verification
4. `POST /api/admin/2fa/disable` - Disable 2FA
5. `POST /api/admin/2fa/backup-codes` - Generate new backup codes

**Frontend Components:**
- 2FA Setup Modal (QR code display, verification input)
- 2FA Verification during login
- 2FA Settings page (enable/disable, regenerate backup codes)

**Features:**
- TOTP (Time-based One-Time Password) using 30-second intervals
- QR code generation for authenticator apps (Google Authenticator, Authy)
- 10 backup codes for account recovery
- Grace period for backup code usage
- Audit logging for 2FA events

**Security Considerations:**
- Store TOTP secrets encrypted
- Rate limit verification attempts
- Log failed 2FA attempts
- Invalidate backup codes after use

---

### Week 2.2: Audit Logging

**Status:** ✅ Complete

**Implementation Summary:**
- Created `audit_logs` table with 90-day auto-cleanup
- Implemented audit middleware (`middleware/audit.js`)
- Added manual logging to controllers:
  - Admin login actions
  - Employee CREATE, UPDATE, DELETE
  - Attendance CHECK_IN, CHECK_OUT
- Created audit controller with filtering, pagination, and stats
- Built Audit Logs viewer component with:
  - Advanced filters (action, entity type, user type, date range)
  - Statistics dashboard
  - CSV export functionality
  - Color-coded action badges

**Configuration:**
- 90-day log retention (auto-cleanup event)
- IP address and user agent tracking
- Accessible to all admins

---

### Week 2.3: Session Management

**Status:** Deferred - Will return after Phase 3

**Implementation Details:**

**Database Changes:**
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('admin', 'employee'),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  remember_me BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Backend Features:**
1. **Session Timeout** - Auto-logout after inactivity (configurable, default 30 minutes)
2. **Active Sessions Display** - Show all active sessions in admin panel
3. **Revoke Sessions** - Allow users to revoke specific sessions
4. **Remember Me** - Extended session duration (7 days) with secure cookie
5. **Session Cleanup** - Automatic cleanup of expired sessions

**Frontend Components:**
- Session Management page (list active sessions)
- Revoke session buttons
- Session timeout warning modal (5 minutes before expiry)
- Auto-logout on timeout

**Security Considerations:**
- Store session IDs securely (HTTP-only, secure cookies)
- Regenerate session IDs on privilege escalation
- Limit concurrent sessions per user
- Detect and prevent session fixation

**Configuration (.env):**
```
SESSION_TIMEOUT_MINUTES=30
SESSION_REMEMBER_ME_DAYS=7
MAX_CONCURRENT_SESSIONS=5
```

---

## Phase 3: Performance & Scalability

### Week 3.1: Redis Caching

**Status:** Pending

**Implementation Details:**

**Dependencies:**
- `redis` - Node.js Redis client
- Redis server (local or Docker)

**Installation:**
```bash
# Backend
npm install redis

# Redis Server (Docker)
docker run -d -p 6379:6379 --name redis redis:alpine

# Or install Redis on Windows
# Download from https://github.com/microsoftarchive/redis/releases
```

**Configuration (.env):**
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL_SECONDS=300
```

**Implementation Steps:**
1. **Create Redis Client** - `backend/config/redis.js`
   - Connection management
   - Error handling
   - Reconnection logic

2. **Update Cache Middleware** - `backend/middleware/cache.js`
   - Replace NodeCache with Redis
   - Implement TTL support
   - Add cache invalidation strategies

3. **Cache Strategy:**
   - Employee list: 5 minutes TTL
   - Attendance logs: 2 minutes TTL
   - Reports: 10 minutes TTL
   - Audit logs: 1 minute TTL

4. **Cache Invalidation:**
   - Clear employee cache on CREATE/UPDATE/DELETE
   - Clear attendance cache on new logs
   - Manual cache clear endpoint for admin

**Benefits:**
- Persistent cache (survives server restarts)
- Shared cache across multiple instances
- Better performance for high-traffic scenarios
- Advanced features (pub/sub, transactions)

**Testing:**
- Verify cache hits/misses
- Test cache invalidation
- Measure performance improvement
- Test with multiple server instances

---

### Week 3.2: WebSocket Support

**Status:** Pending

**Implementation Details:**

**Dependencies:**
- `socket.io` - WebSocket library
- `socket.io-client` - Frontend WebSocket client

**Installation:**
```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

**Features:**
1. **Real-time Attendance Updates** - Live feed of check-ins/check-outs
2. **Live Camera Feed** - Real-time face recognition status
3. **Admin Notifications** - Instant alerts for important events
4. **Session Sync** - Sync logout across multiple tabs

**Backend Implementation:**
```javascript
// backend/server.js
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join admin room for admin users
  socket.on('join-admin', () => {
    socket.join('admin-room');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

module.exports = io;
```

**Frontend Implementation:**
```javascript
// frontend/src/hooks/useSocket.js
import { io } from 'socket.io-client';

export const useSocket = () => {
  const socket = io('http://localhost:5000', {
    auth: { token: localStorage.getItem('admin_token') }
  });
  
  return socket;
};
```

**Use Cases:**
- Display new attendance logs in real-time
- Show face recognition status (scanning, matched, not matched)
- Broadcast admin actions to other admin sessions
- Real-time user count dashboard

**Security:**
- Authenticate WebSocket connections
- Rate limit WebSocket messages
- Validate all incoming data
- Use secure WebSocket (wss://) in production

---

### Week 3.3: Database Optimization

**Status:** Pending

**Implementation Details:**

**1. Connection Pooling:**

**Configuration (.env):**
```
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
DB_WAIT_FOR_CONNECTIONS=true
```

**Implementation:**
```javascript
// backend/config/db.js
const pool = mysql.createPool({
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: process.env.DB_QUEUE_LIMIT || 0,
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'true',
  // ... other config
});
```

**2. Read Replicas (Optional for high-traffic):**

**Configuration (.env):**
```
DB_READ_REPLICA_HOST=localhost
DB_READ_REPLICA_PORT=3306
DB_READ_REPLICA_USER=root
DB_READ_REPLICA_PASSWORD=
DB_READ_REPLICA_DATABASE=facial_attendance_db
```

**Implementation:**
- Separate read pool for SELECT queries
- Write pool for INSERT/UPDATE/DELETE
- Automatic failover to primary if replica fails

**3. Database Backups:**

**Automated Backup Script:**
```bash
# backend/scripts/backup.sh
mysqldump -u root -p facial_attendance_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

**Cron Job (Linux) or Task Scheduler (Windows):**
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

**4. Query Optimization:**

**Index Review:**
- Verify existing indexes are being used
- Add composite indexes for common query patterns
- Remove unused indexes

**Slow Query Log:**
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

**5. Database Maintenance:**

**Weekly Tasks:**
- Analyze tables: `ANALYZE TABLE table_name;`
- Optimize tables: `OPTIMIZE TABLE table_name;`
- Check table integrity: `CHECK TABLE table_name;`

**Benefits:**
- Improved query performance
- Better resource utilization
- Data redundancy and backup
- High availability with read replicas

---

## Phase 4: Mobile & UX

### Week 4.1: Mobile Responsiveness Enhancement

**Status:** Pending

**Implementation Details:**

**1. Progressive Web App (PWA):**

**Dependencies:**
- `workbox-webpack-plugin` - Service worker generation
- `vite-plugin-pwa` - Vite PWA plugin (if using Vite)

**Features:**
- Installable on mobile devices
- Offline functionality for critical features
- Push notifications support
- App manifest for home screen icon

**Implementation:**
```javascript
// vite.config.js (if using Vite)
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Face Attendance',
        short_name: 'Attendance',
        description: 'Facial Recognition Attendance System',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
};
```

**2. Offline Support:**

**Cache Strategy:**
- Cache critical assets (JS, CSS, images)
- Cache API responses for employee list
- Network-first for attendance logs
- Offline fallback page

**3. Mobile Camera:**

**Features:**
- Native camera access on mobile
- Front-facing camera preference
- Camera permission handling
- Responsive camera UI

**Implementation:**
```javascript
// Use getUserMedia with facingMode constraint
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user' }
});
```

**4. Responsive Design Improvements:**

**Mobile-First Approach:**
- Touch-friendly buttons (min 44px height)
- Swipe gestures for navigation
- Bottom navigation bar for mobile
- Hamburger menu for settings
- Optimized form inputs for touch

**5. Performance Optimization:**

- Lazy load images
- Code splitting for routes
- Optimize bundle size
- Use WebP images
- Implement skeleton screens

---

### Week 4.2: Admin Dashboard Enhancements

**Status:** Pending

**Implementation Details:**

**1. Dashboard Widgets:**

**Widget Types:**
- Total employees count
- Today's attendance rate
- Recent activity feed
- Quick stats (check-ins, check-outs)
- Attendance trend chart (last 7 days)
- Department breakdown

**Implementation:**
```javascript
// frontend/src/components/DashboardWidgets.jsx
const widgets = [
  { type: 'stat', title: 'Total Employees', value: employeeCount },
  { type: 'stat', title: 'Today\'s Attendance', value: attendanceRate },
  { type: 'chart', title: 'Weekly Trend', data: weeklyData },
  { type: 'feed', title: 'Recent Activity', items: recentLogs }
];
```

**2. Drag-and-Drop Layout:**

**Dependencies:**
- `react-grid-layout` - Grid layout system
- `react-beautiful-dnd` - Drag and drop

**Features:**
- Customizable widget arrangement
- Save layout preferences per user
- Responsive grid (auto-adjust on resize)
- Reset to default layout

**3. Dark Mode:**

**Implementation:**
```javascript
// Use CSS variables for theming
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
}

[data-theme='dark'] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}
```

**Features:**
- Toggle dark/light mode
- System preference detection
- Persist theme preference
- Smooth theme transitions

**4. Enhanced Charts:**

**Dependencies:**
- `recharts` - Charting library

**Chart Types:**
- Line chart for attendance trends
- Bar chart for department comparison
- Pie chart for attendance breakdown
- Heat map for time-based patterns

---

### Week 4.3: User Profile Management

**Status:** Pending

**Implementation Details:**

**1. Employee Portal:**

**Features:**
- Personal attendance history
- Check-in/check-out status
- Profile photo upload
- Leave request submission
- View approved/rejected leaves

**Database Changes:**
```sql
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  leave_type ENUM('sick', 'vacation', 'personal', 'other'),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_leave_user ON leave_requests(user_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);
```

**2. Profile Photos:**

**Storage Options:**
- Local file system with public URL
- Cloud storage (AWS S3, Cloudinary)
- Database (base64 - not recommended for large files)

**Implementation:**
```javascript
// Multer for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
  destination: './uploads/profiles/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });
```

**3. Leave Management:**

**Admin Features:**
- View all leave requests
- Approve/reject requests
- Leave calendar view
- Leave balance tracking

**Employee Features:**
- Submit leave requests
- View request status
- Check leave balance
- View leave history

**4. Self-Service Features:**
- Update personal information
- Change password (if employees have accounts)
- View attendance summary
- Download attendance report

---

## Phase 5: DevOps & Deployment

### Week 5.1: CI/CD Pipeline

**Status:** Pending

**Implementation Details:**

**1. GitHub Actions Workflow:**

**File:** `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend && npm install
        cd ../frontend && npm install
    
    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm test
    
    - name: Build frontend
      run: cd frontend && npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker build -t face-recog-backend ./backend
        docker build -t face-recog-frontend ./frontend
    
    - name: Push to Docker Hub
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push face-recog-backend:latest
        docker push face-recog-frontend:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: |
        # SSH into server and deploy
        # Or use kubectl for Kubernetes
```

**2. Docker Configuration:**

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
  
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=facial_attendance_db
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

**3. Kubernetes Deployment (Optional):**

**Files:**
- `k8s/backend-deployment.yaml`
- `k8s/backend-service.yaml`
- `k8s/frontend-deployment.yaml`
- `k8s/frontend-service.yaml`
- `k8s/configmap.yaml`
- `k8s/secrets.yaml`

---

### Week 5.2: Monitoring & Alerting

**Status:** Pending

**Implementation Details:**

**1. Application Performance Monitoring (APM):**

**Options:**
- **Sentry** - Error tracking and performance
- **New Relic** - Full-stack monitoring
- **Datadog** - Infrastructure monitoring
- **Prometheus + Grafana** - Open-source monitoring

**Sentry Implementation:**
```bash
npm install @sentry/node
```

```javascript
// backend/sentry.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**2. Error Tracking:**

**Features:**
- Automatic error capture
- Stack traces with source maps
- User context tracking
- Release tracking
- Error alerts via email/Slack

**3. Uptime Monitoring:**

**Options:**
- **UptimeRobot** - Free uptime monitoring
- **Pingdom** - Website monitoring
- **Statuspage** - Status page for users

**Implementation:**
- Monitor API endpoints
- Monitor frontend availability
- Monitor database connectivity
- Monitor Redis connectivity

**4. Logging:**

**Structured Logging:**
```bash
npm install winston
```

```javascript
// backend/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

**Log Aggregation:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch Logs (AWS)
- Papertrail

**5. Metrics Collection:**

**Key Metrics:**
- Response times
- Error rates
- Request rates
- Database query times
- Cache hit/miss ratios
- Active users

**Prometheus Metrics:**
```bash
npm install prom-client
```

---

### Week 5.3: Deployment Automation

**Status:** Pending

**Implementation Details:**

**1. Containerization:**

**Best Practices:**
- Use multi-stage builds
- Minimize image size
- Use .dockerignore
- Scan images for vulnerabilities
- Tag images properly

**2. Database Migrations:**

**Migration Tool:**
- Use a migration tool (Knex.js, db-migrate)
- Version-controlled migrations
- Rollback support
- Migration history tracking

**Implementation:**
```bash
npm install knex
npx knex init
```

**3. Environment Management:**

**Environments:**
- Development
- Staging
- Production

**Configuration:**
- Separate `.env` files per environment
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Never commit secrets to Git

**4. Blue-Green Deployment:**

**Strategy:**
- Maintain two production environments
- Deploy to inactive environment
- Run smoke tests
- Switch traffic to new environment
- Keep old environment as rollback

**5. Zero-Downtime Deployments:**

**Techniques:**
- Load balancer with health checks
- Graceful shutdown handling
- Database schema backward compatibility
- Feature flags for new features

**6. Backup and Disaster Recovery:**

**Backup Strategy:**
- Automated daily backups
- Off-site backup storage
- Backup encryption
- Regular restore testing

**Disaster Recovery Plan:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Documented recovery procedures
- Regular DR drills

**7. Security Hardening:**

**Measures:**
- HTTPS only (SSL/TLS certificates)
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting
- Input validation
- Dependency scanning (npm audit)
- Regular security updates

---

## Summary

### Phase 2: Security Enhancements
- ✅ Week 2.1: Two-Factor Authentication (Deferred)
- ✅ Week 2.2: Audit Logging (Complete)
- ⏳ Week 2.3: Session Management (Deferred)

### Phase 3: Performance & Scalability
- ⏳ Week 3.1: Redis Caching
- ⏳ Week 3.2: WebSocket Support
- ⏳ Week 3.3: Database Optimization

### Phase 4: Mobile & UX
- ⏳ Week 4.1: Mobile Responsiveness Enhancement
- ⏳ Week 4.2: Admin Dashboard Enhancements
- ⏳ Week 4.3: User Profile Management

### Phase 5: DevOps & Deployment
- ⏳ Week 5.1: CI/CD Pipeline
- ⏳ Week 5.2: Monitoring & Alerting
- ⏳ Week 5.3: Deployment Automation

---

## Notes

- Deferred tasks (Phase 2.1, 2.3) will be completed after Phase 3
- All implementations should follow existing code style and patterns
- Always test thoroughly before deploying to production
- Document any deviations from this plan
- Update this plan as requirements evolve
