# SITEFLOW Security Specification (Build 01)
## Zero-Trust Attribute-Based Access Control (ABAC) & Tenant Isolation

### 1. Data Invariants
1. **Multi-Tenant Boundary:** An authenticated user can only access resources where `resource.data.companyId == userCompanyId()`. Cross-tenant data leakage is strictly forbidden.
2. **Immutable Identity:** Once a user account or employee profile is created, `uid`, `userId`, and `companyId` cannot be changed by any party.
3. **Role Escalation Prevention:** A user can never change their own `role` field.
4. **SUPER_ADMIN Protection:** A regular user or ADMIN cannot assign `SUPER_ADMIN` to any user or employee; only existing `SUPER_ADMIN` can promote or invite another `SUPER_ADMIN`.
5. **Private Profile Isolation:** Regular employees can only read and update their own user profile and non-sensitive fields in their employee record.
6. **Audit Trail Immutability:** Audit log entries (`auditLogs`) can never be modified or deleted once created (`allow update, delete: if false`).
7. **Default Deny:** Any unspecified path in the database is denied by default (`match /{document=**} { allow read, write: if false; }`).
8. **Time Entry Immutability & Auditing:** Clock events cannot be deleted (`allow delete: if false`). Non-manager workers can only clock in/out for themselves (`request.auth.uid == resource.data.userId`). Manual supervisor adjustments must be logged.
9. **Job Site & Geofence Authority:** Only Project Managers, Admins, and Super Admins can define or modify job site geofences (`radiusMeters`, coordinates). Field workers have read-only access to active site boundaries.
10. **Shift Dispatch Authority:** Only Supervisors and Managers can create or assign shifts. Field workers can only view assigned shifts.

---

### 2. The "Dirty Dozen" Adversarial Payloads
The following payloads represent attack vectors that our security rules explicitly reject:

1. **Cross-Tenant Snoop (List/Get):**
   - *Target:* `get(/companies/comp_beta)` by user from `comp_alpha`.
   - *Result:* PERMISSION_DENIED (Company ID mismatch).
2. **Self-Escalation to SUPER_ADMIN:**
   - *Target:* `update(/users/user_123)` with `{ "role": "SUPER_ADMIN" }`.
   - *Result:* PERMISSION_DENIED (Role is immutable by user).
3. **Ghost Tenant Hijack:**
   - *Target:* `update(/users/user_123)` with `{ "companyId": "comp_target" }`.
   - *Result:* PERMISSION_DENIED (Company ID is immutable).
4. **Unauthenticated Public Read:**
   - *Target:* `get(/companies/comp_alpha)` with `request.auth == null`.
   - *Result:* PERMISSION_DENIED.
5. **Normal Employee Creating Other Employees:**
   - *Target:* `create(/companies/comp_alpha/employees/emp_999)` by user with role `EMPLOYEE`.
   - *Result:* PERMISSION_DENIED (Only ADMIN / SUPER_ADMIN can create employees).
6. **Audit Log Tampering:**
   - *Target:* `update(/companies/comp_alpha/auditLogs/aud_001)` with `{ "action": "CLEARED" }`.
   - *Result:* PERMISSION_DENIED (Audit records are append-only and immutable).
7. **Audit Log Deletion:**
   - *Target:* `delete(/companies/comp_alpha/auditLogs/aud_001)`.
   - *Result:* PERMISSION_DENIED.
8. **Malicious Giant Payload (Resource Poisoning):**
   - *Target:* `update(/companies/comp_alpha)` with 2MB junk text in `name`.
   - *Result:* PERMISSION_DENIED (Exceeds `maxLength: 200` boundary guard).
9. **Admin Creating Unauthorized SUPER_ADMIN:**
   - *Target:* `create(/companies/comp_alpha/employees/emp_002)` with role `SUPER_ADMIN` by an `ADMIN`.
   - *Result:* PERMISSION_DENIED (Only SUPER_ADMIN can create SUPER_ADMIN).
10. **Shadow Key Injection:**
    - *Target:* `update(/users/user_123)` with `{ "isSuperUser": true }`.
    - *Result:* PERMISSION_DENIED (`affectedKeys().hasOnly()` rejects unrecognized fields).
11. **Employee Reading Another Employee's Private Data:**
    - *Target:* Direct `get(/users/user_456)` by `user_123` with role `EMPLOYEE`.
    - *Result:* PERMISSION_DENIED.
12. **Orphaned Employee Record:**
    - *Target:* `create(/companies/comp_ghost/employees/emp_1)` where company does not exist.
    - *Result:* PERMISSION_DENIED (`exists()` verification on parent company).
13. **Timecard Forgery / Peer Impersonation (Build 02):**
    - *Target:* `create(/companies/comp_alpha/timeEntries/te_999)` with `userId: "other_worker_uid"` by worker.
    - *Result:* PERMISSION_DENIED (`request.resource.data.userId == request.auth.uid` invariant).
14. **Timecard Deletion (Build 02):**
    - *Target:* `delete(/companies/comp_alpha/timeEntries/te_123)` by worker or supervisor.
    - *Result:* PERMISSION_DENIED (Time entries are permanent records).
15. **Worker Modifying Geofence Radius (Build 02):**
    - *Target:* `update(/companies/comp_alpha/jobSites/site_01)` with `{ "radiusMeters": 50000 }` by `EMPLOYEE`.
    - *Result:* PERMISSION_DENIED (Only Project Manager / Admin can modify job sites).
