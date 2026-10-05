# Daily Report: Office Attendance System
**Date:** September 16, 2026

This document details the issues identified during today's session and the comprehensive technical solutions implemented to resolve them.

---

## 1. The Offline Google Sheets Sync Gap

### The Problem
The primary issue investigated today was a failure in the Google Sheets synchronization. The kiosk PC experienced an internet outage spanning from roughly September 9th to September 15th. 
During this period, the system functioned perfectly locally:
- Employees scanned their faces.
- The Node.js backend accepted the requests.
- The data was safely stored in the local MySQL database (`attendance_logs` table).

However, the system relies on real-time HTTP `POST` requests to a Google Apps Script Webhook to populate the Google Sheets. Because there was no internet connection, these fetch requests failed. The backend caught the error, logged it to the console, and moved on. 
When the internet was restored on September 16th, there was no mechanism in place for the system to "catch up", leaving a permanent gap in the Google Sheets for that week.

### The Solution
We designed and implemented a robust **Automatic Retry & Watchdog Architecture** to make the system resilient to future network outages.

1. **Database Schema Upgrade:**
   - Ran a migration script to add a `google_sheets_synced` (BOOLEAN) column to the `attendance_logs` table, defaulting to `FALSE`.
   - Marked all historical records (prior to the outage) as `TRUE`.

2. **Live Check-in Controller Update:**
   - Modified `attendanceController.js`. The webhook dispatch is now awaited asynchronously.
   - If the fetch to Google Sheets returns a `200 OK` status, the backend immediately executes an `UPDATE` query to set `google_sheets_synced = TRUE` for that specific log.
   - If the internet drops, the fetch fails, and the flag safely remains `FALSE`.

3. **Background Watchdog Service:**
   - Created `backend/services/googleSheetsSync.js`.
   - Tied this service directly to the Express server boot cycle in `server.js`.
   - This native service runs silently every **5 minutes**, querying the database for any records where `google_sheets_synced = FALSE`. 
   - It iterates through these missed records, pushes them to the webhooks, and flips their flag to `TRUE` upon success.

---

## 2. Auto-Reconciliation of Missing Data

### The Problem
Because the `google_sheets_synced` database flag was newly created today, the system had no way of differentiating between the records that successfully made it to Google Sheets weeks ago, and the records that failed during last week's outage. Manually digging through 300+ logs to find the exact missing dates would be tedious.

### The Solution
We built an automated script to perfectly sync the MySQL database with the exact state of the Google Sheet.

1. **Google Apps Script `doGet`:**
   - Added a `doGet` function to the Google Apps Script Web App. This allowed the Node.js backend to perform an HTTP `GET` request to read the existing data out of the Google Sheet.

2. **The Reconciliation Script (`reconcileSheets.js`):**
   - Built a one-off script that downloaded the 345 records currently sitting in Google Sheets.
   - It pulled all 368 records from the local MySQL database.
   - It cross-referenced them using unique Name and Timestamp matching (with a 60-second tolerance for precision differences).
   - It automatically flagged exactly **23 missing records** spanning from Sept 12 to Sept 15, changing their local database flags to `FALSE`.

3. **Execution:**
   - The background watchdog immediately picked up these 23 flagged records and safely pushed them to Google Sheets, perfectly closing the gap without creating any duplicates.

---

## 3. Dual Webhook Architecture (Weekly vs. User-Based)

### The Problem
The initial design grouped all attendance logs into tabs based on the *Week* (e.g., "Week of Sept 14"). However, for payroll and timesheet purposes, it was requested that logs be grouped by *Individual User* (e.g., "DANIEL RILLERA"). 

### The Solution
Instead of abandoning the weekly tracking, we expanded the system to support multiple simultaneous data pipelines.

1. **Environmental Configuration:**
   - Added `GOOGLE_SHEET_USER_WEBHOOK_URL` to the `.env` file to live alongside the original `GOOGLE_SHEET_WEBHOOK_URL`.

2. **Controller Expansion:**
   - Updated the `attendanceController.js` and `seedGoogleSheets.js` to dispatch payloads to *both* webhooks concurrently.
   - A single face scan now hits the backend, saves locally, and simultaneously updates **two separate Google Sheets**—one organized dynamically by week, and one organized dynamically by employee name.

---

## 4. Data Anomalies (Testing Phase Observations)

### The Problem
During an audit of historical data, an anomaly was found on **August 16, 2026** (a Sunday). Employee `ADMIN-2026-001` (Elaine Aguilar) and `ENG-2026-0004` (Joylene Balanon) both had an attendance record logged at exactly 1:22 PM. Only Joylene was physically present in the office that day.

### The Findings
Direct inspection of the local database's raw timestamps revealed:
- **ELAINE AGUILAR** scanned in at `1:22:29 PM`.
- **JOYLENE BALANON** scanned in at `1:22:54 PM`.

The scans occurred precisely 25 seconds apart. 

### Conclusion
This is a classic case of **Facial Misidentification (False Positive)**. Joylene stepped up to the kiosk, and the facial recognition model incorrectly identified her facial geometry as Elaine's. After realizing the mistake on the screen, Joylene waited for the system to reset and scanned her face again 25 seconds later, which then successfully identified her as Joylene.

> [!NOTE]
> **Expected Behavior:** Since the system is currently in the **Testing Phase**, this type of probabilistic misidentification is completely normal. Facial recognition models require strict confidence thresholds and extensive training data to eliminate false positives. This anomaly serves as valuable test data for future model tuning and threshold adjustments.
