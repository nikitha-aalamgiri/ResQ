# FloodResQ Emergency Drill Demonstration Script

This script walks through the end-to-end responder-driven incident lifecycle, verifying that SOS statuses transition **only** when explicitly submitted by the assigned responder.

---

## 1. Prerequisites
- **Backend API Server**: Running at `http://localhost:5000` (`npm run dev` in `/server`)
- **Frontend Web Application**: Running at `http://localhost:5173` (`npm run dev` in `/client`)
- **Browser Windows**: Open two side-by-side browser windows:
  - **Window 1 (Left)**: Citizen Portal (`http://localhost:5173/login`)
  - **Window 2 (Right)**: Field Responder Portal (`http://localhost:5173/responder/login`)

---

## 2. Step-by-Step Demonstration Walkthrough

### Step 1: Citizen Triggers Distress SOS
1. In **Window 1 (Citizen)**, sign in as Citizen (`arif.hyd@example.com` / `demo-password-123`).
2. Navigate to **Request SOS** (`/citizen/sos`).
3. Select emergency type **"Trapped by Flood Water"**, set victims count to **3**, check **"Injuries Reported"**.
4. Tap **Confirm & Transmit Distress Dispatch**.
5. The citizen is redirected to `/citizen/sos/status`.
   - **Verification**: Incident identifier (e.g. `FQ1026`) is generated with status `WAITING`.
   - **Critical Check**: Observe the tracking page. The status **remains WAITING indefinitely**; no automatic assignment or advancement takes place.

### Step 2: Responder Claims Incident (Atomic Take)
1. In **Window 2 (Responder)**, sign in as Responder (`vikram.ndrf@resq.gov.in` / `demo-password-123`).
2. Go to **Distress Pool / Incident Queue** (`/responder/triage`).
3. Locate incident `FQ1026` in `WAITING` status.
4. Click **Take Incident / Accept Dispatch Mission**.
   - **Verification**: Incident transitions to `ACCEPTED`.
   - In Window 1 (Citizen), the timeline instantly updates to step 2 **"Responder Assigned"** showing Inspector Vikram's unit details.
   - **Invariance Check**: Leave both windows open. The incident status **remains ACCEPTED** without advancing automatically (even after 90+ seconds).

### Step 3: Responder En Route (`ON_THE_WAY`)
1. In **Window 2 (Responder)**, click **Update Incident Status** (`/responder/incidents/FQ1026/status`).
2. **Observe Form**: The action choices offer **ONLY** the single valid next sequential step: **"On the way"** (`ON_THE_WAY`). Step-skipping buttons are absent.
3. Click **"On the way"** and enter field notes (e.g., *"Deploying Zodiac rescue boat"*). Click **Submit Operational Update**.
4. The incident status updates to `ON_THE_WAY`.
5. **Hint Verification**:
   - The page displays the prominent operational guidance banner:
     > *"You are near the location. Tap Arrived when you reach it."*
   - In Window 1 (Citizen), the badge displays **En Route**.

### Step 4: Admin Demo Controls & Visual Telemetry Check
1. Open a new tab or window as Administrator (`http://localhost:5173/admin/login` -> `admin@resq.gov.in`).
2. Navigate to **Demo Controls** (`/admin/demo`).
3. Click **"Advance Responder One Step (Visual Telemetry)"**.
   - **Verification**: The simulated GPS coordinates marker advances along the rescue corridor.
   - **Critical Check**: The incident status in both Window 1 and Window 2 **remains strictly ON_THE_WAY**. Marker movement never touches or alters incident status.
   - If `VITE_DEMO_SIMULATION=true` is set, a *"Simulated position (demo)"* badge appears on the citizen map.

### Step 5: Responder Arrives On Scene (`ARRIVED`)
1. In **Window 2 (Responder)**, open the status console.
2. The form now offers **ONLY** the single valid next action: **"Confirm Arrival On-Site"** (`ARRIVED`).
3. Click **"Confirm Arrival On-Site"** and tap **Submit Operational Update**.
   - **Verification**: In Window 1 (Citizen), timeline step 3 **"Responder Arrived"** turns green with active strobe confirmation.

### Step 6: Rescue Extraction Complete (`RESCUED`)
1. In **Window 2 (Responder)**, select the single valid next step: **"Confirm Victims Extracted"** (`RESCUED`).
2. Confirm the irreversible modal milestone.
   - **Verification**: Recommended shelter card appears automatically (e.g. *"LB Stadium Indoor Complex"*), displaying available capacity and direct navigation links.
   - Citizen timeline updates to step 4 **"Rescued & Secured"**.

### Step 7: Incident Completion & Transfer (`RESOLVED`)
1. In **Window 2 (Responder)**, select **"Complete Incident & Transfer"** (`RESOLVED`).
2. Submit update.
   - **Verification**: Incident status transitions to `RESOLVED` and is permanently closed.
   - Any further status mutation attempts are rejected by both the backend API and database PostgreSQL trigger (`INVALID_STATUS_TRANSITION`).

---

## 3. Automated Verification Commands

Run the test suite to verify all invariance conditions and database guards:

```bash
# In the /server directory:
npm test

# Expected Output:
# ResQ Outbound SMS Test Suite: 16 passed, 0 failed
# ResQ Status Guard & Transition Test Suite: 10 passed, 0 failed
# Total: 26 passed, 0 failed
```

Run client i18n key parity audit:

```bash
# In the /client directory:
npm run i18n:check

# Expected Output:
# Telugu (te) has 100% key parity with English.
# Hindi (hi) has 100% key parity with English.
# 0 missing keys.
```
