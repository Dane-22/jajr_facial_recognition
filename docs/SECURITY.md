# Security Documentation

## Overview

This document outlines the comprehensive security controls, data protection mechanisms, and architectural hardening implemented in the **Face Recognition Attendance System** to safeguard against unauthorized access, biometric data theft, request spoofing, and common web application vulnerabilities.

---

## Executive Summary of Security Posture

| Security Domain | Status | Core Protection Mechanism |
| :--- | :---: | :--- |
| **Authentication & Authorization** | 🟢 Secured | JWT bearer tokens for admins; `X-Kiosk-Api-Key` middleware (`kioskAuth.js`) for kiosk API endpoints. |
| **Biometric Privacy & Data at Rest** | 🟢 Secured | Local browser face processing (no raw video uploads); **AES-256-GCM encryption** at rest for MySQL face vectors. |
| **Network & Transport Hardening** | 🟢 Secured | Express HTTP Security headers via `helmet`; strict CORS origin policies; JWT auth on Socket.IO `admin-room` sockets. |
| **Input Validation & Injection Prevention**| 🟢 Secured | `express-validator` middleware; `mysql2` parameterized queries preventing SQL injection; `express-rate-limit`. |
| **Audit Trail & Accountability** | 🟢 Secured | Immutable system audit log (`audit_logs`) tracking IP addresses, user agents, actions, and before/after JSON states. |

---

## Implemented Security Controls

### 1. Kiosk Endpoint Authentication (`kioskAuth.js`)

* **Location:** `backend/middleware/kioskAuth.js`
* **Protected Endpoints:** `GET /api/users`, `POST /api/users/register`, `POST /api/attendance/log`, `GET /api/attendance/last/:userId`
* **Mechanism:** Verifies incoming HTTP requests against a pre-shared Kiosk API key (`X-Kiosk-Api-Key`) or a valid Admin JWT token. Rejects unauthenticated requests with `401 Unauthorized` / `403 Forbidden`.
* **Purpose:** Prevents unauthorized network clients, external scrapers, or malicious scripts from querying employee face vectors or forging attendance log entries.

### 2. Biometric Vector Encryption at Rest (`crypto.js`)

* **Location:** `backend/utils/crypto.js`
* **Algorithm:** AES-256-GCM (Authenticated Encryption with Galois/Counter Mode)
* **Mechanism:** Before storing the 128-dimensional face descriptor array in the MySQL `users.face_descriptor` column, `userController.js` and `employeeController.js` encrypt the payload using an IV (Initialization Vector) and authentication tag. Upon reading, descriptors are decrypted in RAM before returning to authorized kiosks.
* **Purpose:** Ensures that raw biometric vectors are unreadable in MySQL database dumps, disk backups, or compromised storage media.

### 3. HTTP Security Headers (`helmet`)

* **Location:** `backend/server.js`
* **Middleware:** `helmet()`
* **Protection Features:**
  * **X-Content-Type-Options:** Prevents MIME-type sniffing.
  * **X-Frame-Options:** Prevents clickjacking attacks via iframe embedding.
  * **X-XSS-Protection:** Enables legacy browser XSS filters.
  * **Strict-Transport-Security (HSTS):** Enforces HTTPS transport.
* **Purpose:** Shields the application against standard web vulnerabilities and browser-side attacks.

### 4. Authenticated Real-Time WebSockets (`Socket.IO`)

* **Location:** `backend/server.js` & `frontend/src/hooks/useSocket.js`
* **Mechanism:** WebSocket clients attempting to join `admin-room` must provide a valid JWT bearer token during connection handshake (`auth: { token }`) or event payload.
* **Purpose:** Blocks unauthorized users from listening to live real-time attendance events broadcast across WebSockets.

### 5. Rate Limiting

* **Location:** `backend/middleware/rateLimiter.js`
* **Configuration:** 100 requests per 15-minute window per IP.
* **Purpose:** Mitigates denial-of-service (DoS) attempts, brute-force login attacks, and API abuse.

### 6. Input Validation & SQL Injection Prevention

* **Location:** `backend/middleware/validation.js`
* **Sanitization:** Validates payload parameters using `express-validator`.
* **Database Driver:** `mysql2` parameterized queries (`SELECT ... WHERE id = ?`) throughout all controllers.
* **Purpose:** Guarantees input data integrity and renders SQL Injection attacks mathematically impossible.

### 7. Password Hashing & Admin Authentication

* **Location:** `backend/controllers/adminController.js` & `backend/middleware/authMiddleware.js`
* **Password Hashing:** Passwords hashed with `bcryptjs`.
* **Session Management:** Signed JSON Web Tokens (JWT) with 24-hour expiration.

---

## Security Best Practices

### For Development
1. **Keep `.env` Secure:** Ensure `KIOSK_API_KEY`, `ENCRYPTION_KEY`, and `JWT_SECRET` are randomly generated and excluded from `.git`.
2. **Rotate Secrets:** Periodically rotate `JWT_SECRET` and `ENCRYPTION_KEY`.

### For Production Deployment
1. **Enable HTTPS / TLS:** Deploy behind an Nginx reverse proxy with Let's Encrypt SSL certificates.
2. **Set `NODE_ENV=production`:** Disables verbose error stack traces in HTTP responses.
3. **Database Firewalls:** Restrict MySQL port `3306` connections exclusively to the API server host IP address.

---

## Updated Security Checklist

- [x] Kiosk API Key endpoint authentication (`kioskAuth.js`)
- [x] Biometric face vector encryption at rest (AES-256-GCM)
- [x] Express security headers (`helmet`)
- [x] WebSocket JWT token authentication
- [x] Rate limiting implemented (100 req / 15 min)
- [x] Input validation & sanitization
- [x] Parameterized SQL queries (SQLi prevention)
- [x] Restricted CORS configuration
- [x] Bcrypt password hashing
- [x] System audit logging (`audit_logs`)
- [ ] HTTPS / SSL enabled (Production)
- [ ] Two-Factor Authentication for admins (Phase 2 Roadmap)
- [ ] Containerized isolation (Phase 5 DevOps)
