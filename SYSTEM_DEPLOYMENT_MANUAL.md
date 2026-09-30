# JAJR deployment: Windows push to production update

The repository is `https://github.com/Dane-22/jajr_facial_recognition.git`. Its development and GitHub default branch is `main`. The observed production checkout is `/root/jajr_facial_recognition` on the Ubuntu server. If your installation is under `/var/www`, use `/var/www/jajr_facial_recognition` in place of `/root/jajr_facial_recognition` below. Run PowerShell commands on the local PC and Bash commands in the server's SSH session.

Pushing to GitHub does not update the running containers. The server must fetch the commit, advance its checkout, rebuild, and pass the verification checks.

This manual must itself be committed and pushed to `origin/main` before the server can fetch it. A local edit alone will not appear on production.

## 1. Test and push from Windows

Open PowerShell in `C:\wamp64\www\jajr_facial_recognition`:

```powershell
cd C:\wamp64\www\jajr_facial_recognition
git status --short --branch
git branch --show-current
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

Confirm the branch is `main` and review every changed file. Stage only the files intended for deployment; do not stage `.env`, database dumps, backups, or generated build output. This example stages this manual only; replace its filename with your intended files for other updates:

```powershell
git add SYSTEM_DEPLOYMENT_MANUAL.md
git diff --cached --check
git diff --cached --stat
git commit -m "Describe the deployment update"
git push origin main
git status --short --branch
```

The final status should show `main...origin/main` without pending changes, except for files you intentionally kept local. Record the commit ID with `git log -1 --oneline` before moving to the server.

## 2. Inspect production before fetching

Connect to the server and confirm that this is the JAJR checkout:

```powershell
ssh root@72.62.254.60
```

```bash
cd /root/jajr_facial_recognition
git remote -v
git status --short --branch
git branch --show-current
docker compose ps
```

If tracked files are modified on the server, inspect and preserve them before switching branches or merging. Do not use `git reset --hard` to make a pull succeed. The production database is stored in the `db_data` Docker volume; neither Git nor a container rebuild backs it up.

## 3. Switch an existing production checkout from master to main once

Only do this section if `git branch --show-current` still says `master`. After the checkout is clean enough to switch:

```bash
git fetch origin main
git switch -c main --track origin/main
git branch --show-current
```

If a local `main` branch already exists, use `git switch main` instead of `git switch -c`. Switching to `origin/main` checks out the latest pushed commit. The old remote `master` branch remains available while production is being migrated.

## 4. Back up and fetch future main updates

Before an update that could affect data, create a database backup outside the repository. Use the active checkout directory and stop if the command fails or the output is empty:

```bash
cd /root/jajr_facial_recognition
umask 077
backup="/root/jajr-backup-$(date +%Y%m%d-%H%M%S).sql"
if docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" "$MYSQL_DATABASE"' > "$backup" && test -s "$backup"; then
  echo "Backup created: $backup"
else
  echo 'Backup failed; stop the update.' >&2
fi
```

The current production logs show MySQL rejecting the application account, so this backup may fail until the database credentials are reconciled. Do not continue with an empty backup or remove the Docker volume to resolve that error. Preserve a verified backup in secure off-server storage.

For routine updates after the server is already on `main`, fetch and advance only by fast forward. Run these commands from `/root/jajr_facial_recognition` after the backup succeeds:

```bash
git status --short --branch
git fetch origin main
git log --oneline HEAD..origin/main
git merge --ff-only origin/main
git log -1 --oneline
```

`git fetch` downloads the new commits without changing the running checkout. `git merge --ff-only origin/main` moves the server checkout to the fetched commit. The last commit should match the one pushed from Windows. If the merge fails, inspect local changes or divergent commits before proceeding.

## 5. Rebuild and verify production

From the production checkout, validate Compose, build the application images, and start or recreate their containers:

```bash
docker compose config --quiet
docker compose build backend frontend
docker compose up -d backend frontend
docker compose ps
```

Compose also starts the `db` and `redis` dependencies if they are stopped. `docker compose build` shows backend and frontend build errors directly in the terminal; a successful build alone does not start the new containers. `docker compose up -d backend frontend` starts them using the built images. Do not remove the `db_data` volume during an update.

Check both the public route and the API:

```bash
curl -sS -o /dev/null -w 'Homepage: %{http_code}\n' https://jajr.xandree.com/
curl -sS -o /dev/null -w 'Attendance settings: %{http_code}\n' https://jajr.xandree.com/api/attendance/settings
curl -fsS https://jajr.xandree.com/api/attendance/settings
```

The settings request should return JSON and HTTP 200. Check the homepage and scan on the actual kiosk device after the API is healthy. The site uses host Nginx on HTTPS, the frontend container on host port 7001, and the backend service on port 7000. Compose service names are `db`, `redis`, `backend`, and `frontend`.

## 6. Check container and server error logs

Run these commands in the server checkout. The first command shows stopped or restarting containers, and the next commands show recent backend, frontend, database, and Redis output:

```bash
docker compose ps -a
docker compose logs --since=15m --tail=100 backend frontend
docker compose logs --since=15m --tail=100 db redis
```

To watch new backend and frontend messages while testing the kiosk, run the following command and press `Ctrl+C` when finished:

```bash
docker compose logs -f --tail=50 backend frontend
```

If the browser gets a `502` or `504`, also inspect the host Nginx proxy and its error log:

```bash
sudo systemctl status nginx --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

An API `500` with `ER_ACCESS_DENIED_ERROR` in backend logs points to MySQL authentication, not the frontend build. A `401` on `/api/users` when the kiosk has no admin session is expected; it does not explain a `500` on `/api/attendance/settings`.

## If attendance settings still return 500

The September 30 production logs show `ER_ACCESS_DENIED_ERROR` for `jajr_admin`. MySQL keeps the account password from when its existing volume was initialized; changing Compose `.env` does not update that account. Test the configured application account and root account from inside the database container without printing their passwords:

```bash
docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -N -e "SELECT 1"'
docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -e "SELECT CURRENT_USER()"'
```

If the application check fails but root login succeeds, inspect the account hosts with `SELECT user, host FROM mysql.user WHERE user = 'jajr_admin';` in an interactive root MySQL session. Then set `DB_PASSWORD` in the checkout's private `.env` to the existing `jajr_admin` password, or change the applicable account password to match `.env`. Recreate the backend with `docker compose up -d --force-recreate backend`, repeat the application check, and then repeat the settings request. If root login fails, recover the original root credential from secure server records. Do not paste passwords into chat, run `docker compose down -v`, or re-import a database dump over production data.
