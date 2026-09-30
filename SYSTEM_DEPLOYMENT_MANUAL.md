# JAJR facial recognition attendance: deployment quick reference

This repository is `Dane-22/jajr_facial_recognition` on branch `main`. The earlier version of this file was copied from ENG PLANNER and contained commands for a different repository, database, and application. Use [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md) for the complete JAJR setup, backup, migration, and troubleshooting procedure.

## Find the JAJR checkout

The observed production checkout is `/root/jajr_facial_recognition`:

```bash
cd /root/jajr_facial_recognition
git remote -v
git branch --show-current
```

If you intentionally installed the repository under `/var/www`, the correct path is `/var/www/jajr_facial_recognition`:

```bash
cd /var/www/jajr_facial_recognition
git remote -v
git branch --show-current
```

For a **new** `/var/www` installation, clone the JAJR repository first:

```bash
cd /var/www
git clone https://github.com/Dane-22/jajr_facial_recognition.git jajr_facial_recognition
cd /var/www/jajr_facial_recognition
```

Run subsequent commands from the checkout that actually contains `docker-compose.yml`. Changing a path in this manual does not move an existing production installation.

## Stack and configuration

Docker Compose services are `db` (MySQL), `redis`, `backend` (Express on port 7000), and `frontend` (Nginx on host port 7001). Host Nginx serves `https://jajr.xandree.com` and forwards it to the frontend container. The frontend forwards `/api/` and `/socket.io/` to the backend.

Before a fresh deployment, create a root `.env` in the chosen checkout with unique `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `JWT_SECRET`, and `KIOSK_API_KEY`, plus `FRONTEND_URL=https://jajr.xandree.com`. Keep `.env` out of Git. Check the resulting Compose configuration without printing secrets:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 db backend frontend
```

Do not import either bundled or local SQL dump into a populated production database. See [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md) for the empty-database initialization procedure and backup requirements.

## Update an existing installation

From the active JAJR checkout, check for local server changes and back up data before updating:

```bash
git status --short
git branch --show-current
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" "$MYSQL_DATABASE"' > /root/jajr-backup-$(date +%Y%m%d-%H%M%S).sql
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend
```

The backup path is outside the checkout. Preserve it securely. Do not run `docker compose down -v` or re-import the initial SQL dump during a routine update.

## Check routing

```bash
curl -sS -o /dev/null -w 'Homepage: %{http_code}\n' https://jajr.xandree.com/
curl -sS -o /dev/null -w 'Attendance settings: %{http_code}\n' https://jajr.xandree.com/api/attendance/settings
```

The homepage and attendance settings should return `200`. These checks verify routing only; verify camera scanning, admin login, and attendance on the actual deployment before relying on it.
