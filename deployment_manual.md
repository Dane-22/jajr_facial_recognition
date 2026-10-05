# Deployment manual: local Windows PC to the JAJR VPS

This guide updates the **existing** JAJR website on its VPS. It starts with a change on your Windows computer, sends that change to GitHub, downloads it on the VPS, and restarts the website. You do not need to install Node.js or MySQL directly on the VPS for this workflow; the existing deployment uses Docker Compose.

**Use this guide only if the VPS already has the project, Docker Compose, a working database, and HTTPS configured.** For an entirely new VPS, ask the server administrator to set those up first. The older `SYSTEM_DEPLOYMENT_MANUAL.md` contains notes about this server, but some other plans in `docs/` describe a different, older PM2 deployment. The commands below match the current `docker-compose.yml`.

## Before you start

You need:

- A Windows PC with Git, Node.js, npm, and PowerShell.
- Permission to push to `https://github.com/Dane-22/jajr_facial_recognition.git`.
- SSH access to the VPS. The previously documented connection is `root@72.62.254.60`; confirm that address with the server owner if it has changed.
- Access to the existing VPS project folder, documented as `/root/jajr_facial_recognition`.
- A quiet time to deploy: restarting the application may briefly interrupt people using it.

**Where to type commands:** Blocks marked **Windows PowerShell** run on your computer. Blocks marked **VPS terminal** run *after* you connect with SSH. Copy one block at a time. If a command reports an error, stop and resolve it before continuing.

**What the words mean:** `git add` chooses files for a commit; `git commit` saves a named snapshot on your PC; `git push` uploads that snapshot to GitHub; `git fetch` downloads GitHub's latest information to the VPS **without changing the site**; `git merge --ff-only` applies the fetched version to the VPS files; Docker Compose builds and starts the website containers.

## Part A — On your Windows computer

### 1. Open the project

Open PowerShell (Start menu → type **PowerShell**) and enter:

```powershell
cd C:\wamp64\www\jajr_facial_recognition
git branch --show-current
git status --short
```

The branch should say `main`. `git status --short` lists changed files. `M` means modified, `D` means deleted, and `??` means Git has never tracked that file. Read the list carefully. This repository can contain screenshots, SQL database dumps, and backup files: **do not use `git add .` unless you have reviewed every file it would include**. Never commit `.env`, passwords, private keys, live database backups, or personal data.

If you are on a different branch, or see changes you do not recognize, stop and ask the project maintainer before deploying.

### 2. Check the change locally

Open the app on localhost and check the feature you changed. If the change affects the backend or frontend, run the appropriate checks:

```powershell
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

Each command should finish successfully. If npm says packages are missing, run `npm ci` inside the affected `backend` or `frontend` folder and repeat the check. A local browser check does not replace the production check in Part C.

### 3. Choose the files to upload

Replace the example paths below with **your actual changed file paths**. Run `git add` once per file or include several explicit paths in one command. If you are deploying this manual alone, use `git add deployment_manual.md`.

**Windows PowerShell — example:**

```powershell
git add deployment_manual.md
git diff --cached --check
git diff --cached --stat
git diff --cached
```

`--cached` shows what will go into the commit. Check the full diff for secrets, accidental deletions, database content, and unrelated files. If you staged a file by mistake, remove **only that file** from the staged list with `git restore --staged "path/to/file"`; this keeps your local edit.

### 4. Commit and push to GitHub

Write a short message describing your real change:

```powershell
git commit -m "Add step-by-step VPS deployment manual"
git push origin main
git log -1 --oneline
git status --short --branch
```

For later deployments, change the commit message to describe that update. Record the short commit ID shown by `git log` (for example, `a1b2c3d`). A successful push shows that `main` was sent to `origin/main`. Remaining lines in `git status` mean local files were not included; confirm that was intentional.

If Git says the push was rejected because the remote has newer commits, stop. Get help integrating those commits on your PC before retrying. Do not force push.

## Part B — On the VPS

### 5. Connect and confirm the right folder

**Windows PowerShell:**

```powershell
ssh root@72.62.254.60
```

The first connection may ask whether to trust the server fingerprint. Check it against the server owner's known fingerprint before accepting. Enter the SSH password if prompted; the password will not appear as you type. After login, the prompt is for the **VPS terminal**, not Windows.

**VPS terminal:**

```bash
cd /root/jajr_facial_recognition
pwd
git remote -v
git branch --show-current
git status --short --branch
docker compose ps
```

The folder should be `/root/jajr_facial_recognition`, the Git remote should be the JAJR GitHub repository, and Docker should show `db`, `redis`, `backend`, and `frontend`. The branch should be `main` for normal updates. If it says `master`, use the one-time branch instructions below. If there are local modified or untracked files on the VPS, find out what they are before merging; do not delete or overwrite them.

#### One-time branch change, only if the VPS says `master`

After confirming the VPS checkout has no changes that would be overwritten:

```bash
git fetch origin main
git switch -c main --track origin/main
git branch --show-current
```

If Git says a local `main` branch already exists, use `git switch main` instead. If Git refuses to switch, stop and investigate the VPS files. Do not use `git reset --hard` to bypass the warning. Once the VPS is on `main`, skip this subsection on future updates.

### 6. Back up the live database

Do this before an application update, especially if database tables or attendance logic changed. The live MySQL data is in Docker's `db_data` volume, outside Git. The following command writes a dated SQL backup under `/root`, outside the repository:

```bash
cd /root/jajr_facial_recognition
umask 077
backup="/root/jajr-backup-$(date +%Y%m%d-%H%M%S).sql"
if docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" "$MYSQL_DATABASE"' > "$backup" && test -s "$backup"; then
  echo "Backup created: $backup"
  ls -lh "$backup"
else
  echo 'Backup failed. Stop here; do not deploy.' >&2
fi
```

Continue **only** if it prints `Backup created` and the file size is greater than zero. Keep a protected copy off the VPS as well. The earlier production manual reports that MySQL authentication had failed for the application account; if this backup fails with access denied, have the VPS administrator fix database credentials before deployment. Do not remove the Docker volume or import an old SQL dump to make the error disappear.

### 7. Fetch the GitHub commit and apply it

Stay in `/root/jajr_facial_recognition` on the VPS:

```bash
git status --short --branch
git log -1 --oneline
git fetch origin main
git log --oneline HEAD..origin/main
git merge --ff-only origin/main
git log -1 --oneline
git status --short --branch
```

The **first** `git log -1` is the old version; write down its commit ID in case you need to recover. `git fetch` only downloads Git information. `git log HEAD..origin/main` lists commits waiting to be applied. `git merge --ff-only` then updates the VPS files. The **last** `git log -1` should match the commit ID you recorded on Windows in step 4. If the list of waiting commits is empty and both IDs already match, the VPS is already on that version.

If the merge reports local changes or divergent history, stop. Do not use `git reset --hard`, `git clean`, or a force pull. A maintainer should inspect those changes first.

### 8. Build and restart the application

Still on the VPS, in the same project folder:

```bash
docker compose config --quiet
docker compose build backend frontend
docker compose up -d backend frontend
docker compose ps
```

Wait for each command to finish before running the next. `config --quiet` checks the Compose file. `build` makes new images from the fetched code. `up -d` starts/recreates the application containers and starts their dependencies if needed. `ps` should show running services. **Never run `docker compose down -v` during an update:** `-v` removes the database volume.

The server uses host Nginx for HTTPS. The frontend container is published on host port `7001` and the backend on `7000`. The frontend itself proxies `/api` to the backend. You normally do not need to edit host Nginx for an ordinary code update.

## Part C — Confirm the public site works

### 9. Check the website and API

**VPS terminal:**

```bash
curl -sS -o /dev/null -w 'Homepage HTTP status: %{http_code}\n' https://jajr.xandree.com/
curl -sS -o /dev/null -w 'API HTTP status: %{http_code}\n' https://jajr.xandree.com/api/attendance/settings
curl -fsS https://jajr.xandree.com/api/attendance/settings
```

The first two commands should show `200`; the last should print JSON attendance settings and exit without an error. Open `https://jajr.xandree.com/` in a browser, check the feature you deployed, then test attendance scanning on the actual kiosk if your update affected it. A camera on a public site needs HTTPS.

### 10. Check recent errors

**VPS terminal:**

```bash
docker compose ps -a
docker compose logs --since=15m --tail=100 backend frontend
docker compose logs --since=15m --tail=100 db redis
```

Look for containers repeatedly restarting or errors that appeared after deployment. To follow new messages during a test, use `docker compose logs -f --tail=50 backend frontend` and press **Ctrl+C** to stop watching. Ctrl+C here does not stop the containers.

If the site shows **502** or **504**, also check host Nginx:

```bash
sudo systemctl status nginx --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

If `/api/attendance/settings` shows **500** and backend logs show `ER_ACCESS_DENIED_ERROR`, the backend cannot log in to MySQL. An existing MySQL volume keeps the password it was created with; changing the Compose `.env` alone does not change that database account. Ask the VPS administrator to reconcile the credentials, then recreate the backend and repeat step 9.

### 11. Finish

When the website, API, and kiosk checks pass, type `exit` to close SSH. Record the deployment time, deployed commit ID, backup path, and test result in your team's deployment notes.

## If something goes wrong

- **Build fails:** The old running containers usually keep serving. Read the build error, fix the code on Windows, then commit, push, fetch, and rebuild again.
- **GitHub authentication fails:** Confirm you have repository access and your Git credentials or SSH key are configured. Do not put passwords or tokens in commands or this file.
- **VPS cannot fetch:** Check the VPS network and its GitHub credentials. `git fetch` has not changed the running app.
- **App starts but a check fails:** Read `docker compose logs --since=15m --tail=100 backend frontend` and compare with the old commit ID recorded in step 7. Preserve the database backup. Have the maintainer prepare a corrective commit or coordinate a rollback. Do not reset Git history or remove volumes as a quick fix.
- **Uploaded chat files disappear after recreation:** `backend/uploads` is not mounted to persistent storage in the current Compose file. Arrange a persistent volume and back up existing uploads before relying on them across container recreation.

This guide updates application code. It does **not** migrate local WAMP/MySQL data from your PC to production. Database schema changes or data imports need a separate, reviewed migration and backup plan.
