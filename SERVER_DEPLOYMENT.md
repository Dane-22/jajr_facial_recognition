# JAJR deployment manual

Current target: Ubuntu 24.04, `/root/jajr_facial_recognition`, `https://jajr.xandree.com` (`72.62.254.60`). Run `powershell` blocks locally on Windows and `bash` blocks inside the SSH session. This manual describes the repository's Docker Compose deployment. `SYSTEM_DEPLOYMENT_MANUAL.md` describes an unrelated project; `docs/DEPLOYMENT_PLAN.md` describes an older PM2 setup.

## Architecture

```text
Browser → HTTPS host Nginx (:443) → frontend container (:7001 on host)
                                     ├─ React/Vite static files
                                     ├─ /api/ → backend container (:7000)
                                     └─ /socket.io/ → backend container (:7000)
Backend → MySQL 8 (named db_data volume) and Redis (no persistent volume)
```

The host Nginx proxies all site paths to `127.0.0.1:7001`. The frontend container routes API and Socket.IO requests. Express also serves `/uploads/`, but the present frontend Nginx config has no `/uploads/` proxy. Compose publishes backend port 7000 and frontend port 7001 on **all** host interfaces; MySQL and Redis have no host port mapping.

## Prerequisites and configuration

Install Git, Docker Engine with the Compose plugin, host Nginx, and Certbot with its Nginx plugin on Ubuntu 24.04. Confirm `docker compose version`, `nginx -t`, the domain's DNS A record, and access to ports 80/443. Keep SSH allowed in the server and provider firewalls. Restrict external access to ports 7000/7001. Binding them to `127.0.0.1` in Compose is preferable after verifying no kiosk or mobile client connects directly to 7000.

The current `docker-compose.yml` has **different fallback passwords** for MySQL's `MYSQL_PASSWORD` and the backend's `DB_PASSWORD`. Create `/root/jajr_facial_recognition/.env` with explicit values so both services receive the same app password:

```dotenv
DB_ROOT_PASSWORD=<unique strong root password>
DB_PASSWORD=<unique strong app password>
JWT_SECRET=<long random secret>
KIOSK_API_KEY=<long random secret>
FRONTEND_URL=https://jajr.xandree.com
```

Generate each secret separately, for example with `openssl rand -hex 32`. Protect `.env` with `chmod 600 .env`; never commit or paste its contents. The root `.env` is read by Compose for interpolation. To pass `FRONTEND_URL` into the backend container, add this entry to the backend service's `environment` list in `docker-compose.yml`:

```yaml
- FRONTEND_URL=${FRONTEND_URL:?Set FRONTEND_URL in .env}
```

The backend uses that value for HTTP and Socket.IO CORS; otherwise it defaults to `http://localhost:3000`. `backend/.env.example` is a local-development template with different database settings. Do not copy it into production. Because `backend/Dockerfile` runs `COPY . .` and there is no `backend/.dockerignore`, a local `backend/.env` can be baked into an image. Before building, add `backend/.dockerignore` containing at least `.env`, `backups/`, `uploads/`, and `node_modules/`; supply runtime secrets through Compose. Changing `.env` later does not rotate a MySQL user's password in an existing `db_data` volume.

For chat attachments, add persistent storage for `/app/uploads` in the backend service and proxy `/uploads/` from `frontend/nginx.conf` to `http://backend:7000` without stripping the path. For a fresh install, these entries illustrate the required changes:

```yaml
# Under services.backend:
volumes:
  - uploads_data:/app/uploads
# Under the top-level volumes section:
uploads_data:
```

```nginx
# Inside the frontend server block:
location /uploads/ {
    proxy_pass http://backend:7000;
    proxy_set_header Host $host;
}
```

For an existing installation, copy files already in the backend container's `/app/uploads` to safe storage **before** adding an empty volume, which would hide them. Back up the mounted upload data separately. Without these changes, uploaded files may be unreachable through the public site and may disappear on container recreation. Backend-generated files under `/app/backups` are also ephemeral unless mounted; use the host-side backup command below.

## Fresh installation

In Windows PowerShell:

```powershell
ssh root@72.62.254.60
```

On the Ubuntu host:

```bash
cd /root
git clone https://github.com/Dane-22/jajr_facial_recognition.git
cd /root/jajr_facial_recognition
git status --short
docker compose version
```

Create `.env` and make the configuration corrections above. Then build and start:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 db backend frontend
```

Do not share `docker compose config` without `--quiet`: its output includes secrets. Compose does not automatically import the schema, and it has no health checks. On a **new, empty** database only, wait for MySQL and import the bundled dump:

```bash
docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqladmin ping -u "$MYSQL_USER" --silent'
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"' < backend/facial_attendance_db.sql
docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES"'
```

The dump contains `DROP TABLE` statements and seeded account/attendance data. **Never import it into a populated production database.** Review its data before using it anywhere. `backend/initDatabase.js` refers to a missing `database.sql`, and `backend/seedAdmin.js` resets the admin password to a known value; do not use either for production setup. Set or rotate administrator credentials through the supported admin flow.

### The newer local SQL dump is not a routine seed

The local file `facial_attendance_db (1).sql` was generated on September 29, 2026. It is a full phpMyAdmin export, not an incremental patch. It drops and recreates 12 tables, including `admins`, `users`, `attendance_logs`, and `audit_logs`. It contains 462 attendance rows and 618 audit rows, compared with 166 and 308 in the older bundled dump. It does not set `FOREIGN_KEY_CHECKS=0`, so an import over an existing schema may also fail partway through on foreign keys. The application logs show production activity after the export time, so replacing production with this file could lose newer records. **Do not pipe this file into the live database.** Decide whether the intended operation is a reviewed merge or a full replacement, take and verify a production backup, and compare current production rows before preparing an import plan. The file currently exists on the local Windows checkout; it has not been imported by this manual.

### Host Nginx and HTTPS

The observed `/etc/nginx/sites-enabled/jajr` already has Certbot certificate and HTTP redirect blocks. Preserve them. Its application location is:

```nginx
location / {
    proxy_pass http://127.0.0.1:7001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

For a new host, configure the domain on port 80, then issue HTTPS with `certbot --nginx -d jajr.xandree.com`. Browser camera access requires HTTPS on a public domain. After a host config edit:

```bash
nginx -t
systemctl reload nginx
```

## Verification

```bash
docker compose ps
curl -sS -o /dev/null -w 'Homepage: %{http_code}\n' https://jajr.xandree.com/
curl -sS -o /dev/null -w 'Login validation: %{http_code}\n' \
  -X POST https://jajr.xandree.com/api/admin/login \
  -H 'Content-Type: application/json' -d '{}'
```

Expected: homepage `200` and empty login POST `400`. `GET /api/admin/login` returning `404` is expected because the route accepts POST only. These checks establish routing and validation, **not** authentication or database health. Use an authorized test account to verify login and a database-backed page. In a browser, verify camera permission, Socket.IO, and a known chat attachment URL after the upload fix. Inspect `docker compose logs --tail=100 backend frontend` and browser network errors.

### Check current errors without changing data

On the Ubuntu server, these commands inspect running services, recent logs, host Nginx errors, and database row counts:

```bash
cd /root/jajr_facial_recognition
docker compose ps
docker compose logs --since=30m --tail=100 db backend frontend redis
tail -n 100 /var/log/nginx/error.log
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT COUNT(*) AS attendance_rows FROM attendance_logs; SELECT COUNT(*) AS audit_rows FROM audit_logs;"'
```

Check for containers that are restarting or exited, SQL connection failures, `500`/`502` responses, and browser Console/Network errors while reproducing the problem. `docker compose ps` reports running state, not application health. A manual SQL import error normally appears in the terminal running `mysql` as `ERROR ... at line ...`; it may not appear in `docker compose logs db`. Capture that first error and the line number. Do not rerun a destructive full dump merely to reproduce it.

## Routine update and backup

The local checkout currently uses branch `master`. Verify the server branch before pulling. From Windows PowerShell, test and commit only intended changes:

```powershell
git status --short
git branch --show-current
git add <intended-files>
git commit -m "Describe the change"
git push origin master
```

On the server, inspect its worktree first. The supplied session shows an untracked nested `jajr_facial_recognition/` directory; investigate its contents before cleanup or pull. Back up the database and mounted uploads before an update that might affect them:

```bash
cd /root/jajr_facial_recognition
git status --short
git branch --show-current
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" "$MYSQL_DATABASE"' > /root/jajr-backup-$(date +%Y%m%d-%H%M%S).sql
git pull --ff-only origin master
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend
```

Keep backups outside the checkout and copy them to secure off-server storage. `docker compose up -d --build` may recreate containers and cause a short interruption. Do not run `docker compose down -v`: that removes the MySQL volume. Do not re-import the initial SQL dump on updates. A code rollback does not undo database changes; restore a pre-update dump only after preserving any newer data.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `502` | `docker compose ps`; host Nginx upstream `127.0.0.1:7001`; both Nginx logs. |
| API returns SPA HTML | Check `/api/` in `frontend/nginx.conf`, then rebuild frontend. |
| Empty login POST returns `400` | Expected input validation; test with authorized credentials. |
| Database login fails | Check `db` logs and the password used when `db_data` was first initialized. |
| Chat attachment returns `404` or HTML | Add `/uploads/` proxy and persistent `/app/uploads` storage. |
| Socket.IO fails | Check `/socket.io/` forwarding and backend `FRONTEND_URL`. |

## Review of the supplied SSH session

- The first SSH password was rejected and the next succeeded; this does not indicate an application fault.
- Host Nginx passed `nginx -t`, reloaded, and returned `200` for the HTTPS homepage.
- `GET /api/admin/login` returned `404` and an empty `POST` returned `400`, matching the Express route and validation code.
- Compose showed four running containers. Only the frontend had just started; backend, database, and Redis showed about five weeks of uptime. That does not prove the latest backend code or schema is running.
- The top-level Compose `version: '3.8'` warning is informational; current Compose ignores it. Remove the field in a separate reviewed change.
- The untracked nested directory needs inspection. The transcript does not show what it contains.
- Ubuntu reported 65 available updates, additional ESM security updates, one failed unattended update, and a required reboot. Review `/var/log/unattended-upgrades/unattended-upgrades.log`, apply planned updates, and reboot in a maintenance window after confirming backups and service restart behavior. The single zombie process is a separate host-health item to identify if it persists.
- Later application logs showed two rejected login attempts (`401`) followed by a successful login (`200`). Dashboard, employee, attendance, audit, chat-room, and report requests returned `200` or cache-validating `304`. WebSocket requests returned `101`, and the backend logged authenticated Socket.IO admin-room joins. These are evidence that login, several database-backed reads, and WebSocket routing worked in that observed window.
- The logs did not establish camera operation, chat-attachment delivery or persistence, or that every production table matches the local SQL dump. No production seed/import was performed as part of this review.
