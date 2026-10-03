# ResQ Incident Status Audit & Enforcement Report

**Audit Date**: October 2026  
**System**: FloodResQ Emergency Response Platform  
**Scope**: All repositories, client components, Express API services, Supabase database triggers, RLS policies, background timers, simulation runners, and demo scripts.

---

## 1. Executive Summary

An audit was conducted across the codebase to identify every code path capable of writing, mutating, or advancing `sos_requests.status` or inserting into `sos_status_log`. 

The investigation confirmed that an automated drill timer (`setTimeout` in `server/src/services/sosStore.js`) was automatically setting distress incidents from `WAITING` to `ASSIGNED` 10 seconds after creation. Additionally, client RLS policies permitted direct client update access, and admin bulk endpoints had unprotected status modification actions.

All automatic writers have been eradicated. Status transitions are now strictly restricted to:
1. `PATCH /api/sos/:id/take`: Sets status to `ACCEPTED` only (atomic, responder assignment).
2. `PATCH /api/sos/:id/status`: Transition authorized solely for the assigned responder (or admin with an audited reason), executing strictly one step at a time along the validated chain (`WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED`).

---

## 2. Comprehensive Component Audit Table

| Source Location | Line(s) | Mechanism / Description | Risk / Defect | Remediation Status |
| :--- | :---: | :--- | :--- | :--- |
| `server/src/services/sosStore.js` | 257–289 | `setTimeout` timer (10s) simulating NDRF assignment | **CRITICAL BUG**: Automatically changed status to `ASSIGNED` and appended status log without responder action. | **REMOVED**. Completely excised the automatic timer. |
| `server/src/services/sosStore.js` | 449 | `takeSOS`: Sets `existing.status = 'ACCEPTED'` | Normal incident take. | **RESTRICTED**. Verified it sets `ACCEPTED` only; does not chain to `ON_THE_WAY` or beyond. |
| `server/src/services/sosStore.js` | 640 | `updateSOSStatus`: Sets `existing.status = normalizedNext` | Responder manual status transition. | **RESTRICTED**. Added assignment authorization check (`assigned_responder_id === req.user.id`), rejected resolved incidents, prevented step-skipping. |
| `server/src/services/sosStore.js` | 694 | `assignSOSByAdmin`: Set `existing.status = 'ASSIGNED'` | Admin assignment moved status. | **RESTRICTED**. Assignment now assigns `assigned_responder_id` without changing status. Status changes require explicit responder/admin status updates. |
| `server/src/services/sosStore.js` | 753 | `bulkUpdateSOS`: `action === 'status'` | Allowed bulk arbitrary status overwrites. | **REMOVED**. Removed `action === 'status'` from bulk endpoints. |
| `server/src/services/sosStore.js` | 789–802 | `createSupportRequest`: Logged `need_support` into `sos_status_log` | Auxiliary support logging. | **AUDITED & RESTRICTED**. Side outcome logged for dispatch, does not advance main chain. |
| `server/src/index.js` | 555–587 | `PATCH /api/sos/:id/take` route | Authorized take route. | **RESTRICTED**. Enforced valid JWT, role check (`responder` or `admin`), sets `ACCEPTED` only. |
| `server/src/index.js` | 590–638 | `PATCH /api/sos/:id/status` route | Authorized status update route. | **RESTRICTED**. Enforced caller is assigned responder (or admin with mandatory reason), incident not `RESOLVED`, sequential step only. `changed_by` derived strictly from `req.user.id`. |
| `server/src/index.js` | 710–725 | `POST /api/sos/bulk` | Bulk admin actions. | **RESTRICTED**. Disallowed `status` actions. |
| `client/src/pages/citizen/SOSStatusPage.jsx` | 157 | `setInterval` (4s polling) | Polling reader. | **AUDITED & RETAINED**. Read-only fallback. Local state is never set or advanced by timers. |
| `client/src/pages/responder/UpdateStatusPage.jsx` | 114–178 | `executeStatusUpdate` | Responder update form. | **RESTRICTED**. UI updates only after server response (zero optimistic changes). Irreversible steps require confirmation. |
| `client/src/pages/responder/IncidentDetailsPage.jsx` | 149–187 | `handleAssignToMe` | Take button. | **RESTRICTED**. Buttons disable during in-flight requests; entry point restricted to Take and Update. |
| `client/src/pages/admin/AdminDispatchPage.jsx` | 214–320 | Single & bulk assign buttons | Admin dispatch tools. | **RESTRICTED**. Assigns responder ID only, does not alter incident status. |
| `supabase/rls.sql` | 96–126 | RLS `FOR UPDATE` on `sos_requests` for clients | Allowed direct client UPDATE on `sos_requests.status`. | **RESTRICTED**. Revoked direct client update policies. All status writes must go through backend service role. |
| `supabase/rls.sql` | 243–247 | RLS `FOR INSERT` on `sos_status_log` for clients | Allowed direct client INSERT on `sos_status_log`. | **RESTRICTED**. Revoked client INSERT policies on status logs. Server service role is sole writer. |
| `supabase/migrations/004_status_guard.sql` | — | Database trigger `guard_sos_status_transition` | Absence of DB-level transition validator. | **ADDED**. Enforces state machine at PostgreSQL engine level. |
| Simulation & Demo Panel | — | Movement simulation & `/admin/demo` | Needed isolation so movement never touches status. | **RESTRICTED**. `VITE_DEMO_SIMULATION=true` opt-in only moves markers visually. Control panel never alters status of existing real incidents. |

---

## 3. Verified State Transition Invariants

1. **State Machine Linear Chain**:
   ```
   WAITING (or 'open')
       │  [PATCH /api/sos/:id/take]
       ▼
   ACCEPTED (or 'assigned')
       │  [PATCH /api/sos/:id/status by assigned responder]
       ▼
   ON_THE_WAY
       │  [PATCH /api/sos/:id/status by assigned responder]
       ▼
   ARRIVED
       │  [PATCH /api/sos/:id/status by assigned responder]
       ▼
   RESCUED
       │  [PATCH /api/sos/:id/status by assigned responder]
       ▼
   RESOLVED
   ```
2. **Side Outcomes**:
   - `need_support`, `could_not_locate`, `converted_to_shelter` append an audit log to `sos_status_log` with `changed_by = req.user.id`, but **never** advance the progression index of `sos_requests.status`.
3. **Database Guard Trigger**:
   - `trg_guard_sos_status` raises exception on any attempt to skip steps or transition backwards.
