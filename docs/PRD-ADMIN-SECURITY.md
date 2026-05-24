# Product Requirements Document — Secure Admin Panel

## فاهم! Admin — Zero-Trust Architecture

---

| Field | Value |
|---|---|
| **Document Name** | Faahm Admin Panel Security PRD |
| **Version** | 1.0 |
| **Status** | Draft — Ready for Implementation |
| **Last Updated** | May 2026 |
| **Owner** | Ibrahim — n8nar.com |
| **Security Lead** | TBD |
| **Target Implementation** | Q3 2026 (3 phases over 8 weeks) |
| **Classification** | Internal — Sensitive |

---

## Table of Contents

1. Executive Summary
2. Threat Model
3. Security Principles
4. Architecture Phases
5. Phase 1: Application-Layer Hardening
6. Phase 2: Network Isolation (Subdomain)
7. Phase 3: Zero-Trust (Cloudflare Access)
8. Authentication & Identity
9. Authorization & Roles
10. Audit Logging
11. Session Management
12. Anti-Abuse & Rate Limiting
13. Data Protection
14. Incident Response
15. Compliance
16. Testing & Validation
17. Monitoring & Alerting
18. Implementation Checklist
19. Cost Analysis
20. Appendices

---

## 1. Executive Summary

### 1.1 Why This Document Exists

The current admin panel sits at `/admin` on the same domain as the public site. While role checks exist, this exposes us to:

- URL enumeration by attackers ("what's behind `/admin`?")
- Phishing attacks (`faahm.com/admin` looks legitimate even to attackers)
- Brute force on the admin login form
- Session hijacking if a student's session cookie is stolen
- No defense-in-depth — one bug = full compromise
- No audit trail for sensitive actions
- Risk of accidental indexing by search engines

The admin panel controls:
- All courses (can delete entire content library)
- All user accounts (can read PII, force password resets)
- All payments (can issue refunds, manipulate balances)
- All subscriptions (can grant/revoke premium access)

**A compromised admin account = total business compromise.**

### 1.2 Solution Summary

A 3-phase zero-trust architecture:

```
Phase 1 (Done):    Application-layer hardening (current state)
                   ├── Role-based access control
                   ├── Hidden from public UI
                   ├── X-Robots-Tag noindex
                   └── Audit logging

Phase 2 (8 weeks): Network isolation
                   ├── Subdomain: admin.faahm.com
                   ├── Separate Vercel project
                   ├── No shared cookies with public site
                   └── Independent deployment

Phase 3 (12 weeks): Zero-trust gateway
                   ├── Cloudflare Access in front
                   ├── 2FA mandatory (TOTP)
                   ├── IP allowlist (admins only)
                   ├── Geographic restriction
                   ├── Device posture checks
                   └── Per-session approval logs
```

### 1.3 Success Criteria

| Metric | Current | Target |
|---|---|---|
| Time-to-compromise (red team) | <1 hour | >40 hours |
| Brute force attempts before lockout | ~∞ | 5 |
| Admin actions logged | 100% (basic) | 100% (detailed + immutable) |
| Required factors for admin access | 1 (password) | 4 (network + device + 2FA + role) |
| Mean time to detect anomaly | N/A | <5 minutes |
| Search engine visibility | None | None (verified) |

---

## 2. Threat Model

### 2.1 Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|---|---|---|
| Course content metadata | Medium | Content theft, defacement |
| Course video URLs | High | Piracy, revenue loss |
| User PII (email, name, phone) | High | Privacy violation, legal liability |
| Payment records | Critical | PCI exposure, refund fraud |
| Subscription status | High | Free premium access fraud |
| Admin credentials | Critical | Full takeover |
| Supabase service role key | Critical | DB-level takeover |
| Audit logs | High | Cover-up of attacks |

### 2.2 Threat Actors

| Actor | Motivation | Capability | Likelihood |
|---|---|---|---|
| **Script kiddies** | Curiosity, defacement | Low (automated tools) | High |
| **Competing platforms** | Steal courses, sabotage | Medium | Medium |
| **Pirates / content thieves** | Re-upload courses elsewhere | Medium | High |
| **Disgruntled former employee** | Revenge, data theft | High (insider knowledge) | Low |
| **Targeted attackers** | Specific business harm | High (persistent) | Low |
| **Nation-state** | Surveillance, censorship | Very High | Very Low |
| **Accidental insider** | Mistakes (wrong delete) | N/A | Medium |

### 2.3 Attack Vectors

#### 2.3.1 External
- **Credential stuffing**: Reusing leaked passwords against admin login
- **Phishing**: Fake admin login page, social engineering
- **Brute force**: Automated password guessing
- **URL enumeration**: Discovering `/admin` through scrapers
- **Session hijacking**: Stealing cookies via XSS or network sniffing
- **CSRF**: Tricking admin into performing unwanted action
- **API abuse**: Exploiting weak endpoints
- **Supply chain**: Compromised npm dependency

#### 2.3.2 Internal
- **Accidental exposure**: Admin shares URL on Twitter screenshot
- **Lost devices**: Admin laptop stolen with active session
- **Weak passwords**: Reused across services
- **Shared credentials**: Multiple people using same admin account
- **Privilege escalation**: Student account elevated to admin via bug

### 2.4 STRIDE Analysis

| Threat | Example | Mitigation |
|---|---|---|
| **S**poofing | Fake admin login page | HTTPS, EV cert (Phase 3), unique subdomain |
| **T**ampering | Modify course price via API | RLS, server-side validation, audit logs |
| **R**epudiation | Admin denies deleting course | Immutable audit log with timestamps |
| **I**nformation Disclosure | Course thumbnails leaking via referrer | Strict referrer policy, no cross-origin leaks |
| **D**enial of Service | Flood admin endpoints | Rate limiting, Cloudflare protection |
| **E**levation of Privilege | Student becomes admin | Role checks at every layer, no client-side trust |

### 2.5 Out of Scope (for this PRD)

- Physical security of admin's laptop (admin's responsibility)
- Social engineering of admin (training, not tech)
- Hetzner/Vercel/Supabase infrastructure security (vendor responsibility)
- DDoS at the network layer (Cloudflare handles)

---

## 3. Security Principles

### 3.1 Defense in Depth
Every action must pass **multiple independent checks**. If one layer fails, others catch it. Phase 3 design: 4 layers (network IP → device → 2FA → role check).

### 3.2 Least Privilege
- Admins get only the permissions they need
- Future: separate roles (content admin, billing admin, super admin)
- Service-role keys never exposed to client

### 3.3 Zero Trust
- No request is trusted by default — even from "inside" the network
- Every request to admin must reauthenticate context
- No implicit cross-domain trust between public and admin

### 3.4 Fail Secure
- Errors default to denial (HTTP 403/404), not allow
- Database connection lost → admin features unavailable, not "anything goes"
- Auth check fails → log out, don't degrade gracefully

### 3.5 Visibility Everywhere
- Every admin action logged with: who, what, when, where (IP), how (user agent)
- Logs are immutable (write-once)
- Anomalies trigger real-time alerts

### 3.6 Cryptographic Hygiene
- All secrets in env vars (never committed)
- HTTPS-only with HSTS
- Strong password hashing (bcrypt, default Supabase)
- Sessions: short-lived tokens + rotating refresh

### 3.7 Make the Right Thing Easy
- 2FA setup should take <2 minutes
- Audit log search should be one click
- Password rotation should be automated

---

## 4. Architecture Phases

### 4.1 Phase Comparison

| Feature | Phase 1 (current) | Phase 2 | Phase 3 |
|---|---|---|---|
| Domain | `faahm.com/admin` | `admin.faahm.com` | `admin.faahm.com` |
| Vercel project | Shared with public | Separate | Separate |
| Cookies shared with public | Yes | No (different domain) | No |
| Cloudflare Access | No | No | **Yes (mandatory)** |
| 2FA | No | Optional | **Mandatory (TOTP)** |
| IP allowlist | No | No | **Yes (admin IPs only)** |
| Geographic restriction | No | No | **Optional (Egypt/GCC)** |
| Device posture | No | No | **Optional (warp client)** |
| Audit log granularity | Page hits | Page + actions | Page + actions + payloads |
| Time to implement | Done | 8 weeks | +4 weeks |
| Monthly cost | $0 | $0 | $0-7 (Access free tier) |
| Effort | Done | Medium | Medium-high |

### 4.2 Recommended Approach

**Start with Phase 1 (done), ship MVP, then immediately begin Phase 2 in parallel.** Phase 3 can wait until:
- We have paying customers (something worth protecting)
- We have admin team > 1 person (multiple credentials at risk)
- Detected first attack attempt

---

## 5. Phase 1: Application-Layer Hardening

### 5.1 Status: ✅ Implemented

### 5.2 Components

#### 5.2.1 Role-Based Access Control
- Middleware checks `profiles.role = 'admin'` before serving `/admin/*` pages
- Non-admins redirected to `/dashboard`
- Unauthenticated users redirected to `/login`
- Role check uses Supabase service-client (bypasses RLS edge cases)

```typescript
// middleware: every admin route
if (isAdminRoute && user) {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');
}
```

#### 5.2.2 UI Cleanup
- No "Admin" link in public navbar
- No admin link in student dashboard
- Admin URLs not referenced in any public page source

#### 5.2.3 Search Engine Protection
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` on all admin responses
- `robots.txt` explicitly disallows `/admin/*`, `/x-mgmt-*`, `/api/`, `/auth/`
- Sitemap.xml excludes admin paths

#### 5.2.4 Browser-Side Hardening
- `X-Frame-Options: DENY` (prevents clickjacking via iframe)
- `Cache-Control: no-store, no-cache, must-revalidate` (no caching of admin pages)
- CSP headers (Phase 2 enhancement)

#### 5.2.5 Audit Log (Basic)
- Every admin page access logged to `admin_audit_log` table
- Fields: user_id, path, ip, user_agent, timestamp
- Failed auth attempts logged separately
- Table is RLS-protected (admin-read-only, no API writes)

### 5.3 Gaps in Phase 1

| Gap | Severity | Addressed In |
|---|---|---|
| Shares cookies with public site | High | Phase 2 |
| No 2FA | High | Phase 3 |
| No rate limiting | Medium | Phase 2 |
| No IP restriction | Medium | Phase 3 |
| Action-level audit (not just page) | Medium | Phase 2 |
| No anomaly detection | Low | Phase 3 |
| Session fixation possible | Low | Phase 2 |

---

## 6. Phase 2: Network Isolation (Subdomain)

### 6.1 Status: Planned — 8 weeks

### 6.2 Goal

Move admin panel to `admin.faahm.com` as a separate Vercel project. This isolates it from public traffic, breaks cookie sharing, and lets us apply stricter security headers without affecting the public site's UX.

### 6.3 Architecture

```
                      ┌───────────────┐
                      │  Cloudflare   │
                      └──┬─────────┬──┘
                         │         │
              ┌──────────▼─┐     ┌─▼───────────┐
              │ faahm.com  │     │admin.faahm  │
              │  (public)  │     │  .com       │
              └──────┬─────┘     └──────┬──────┘
                     │                  │
          ┌──────────▼──────────┐  ┌────▼────────────┐
          │ Vercel Project A    │  │ Vercel Project B│
          │ (faahm)             │  │ (faahm-admin)   │
          │ - Marketing         │  │ - Admin only    │
          │ - Student dashboard │  │ - No public     │
          │ - Course player     │  │   pages         │
          └──────────┬──────────┘  └────────┬────────┘
                     │                      │
                     └──────────┬───────────┘
                                │
                        ┌───────▼────────┐
                        │ Supabase       │ ← shared DB
                        │ (single instance)│
                        └────────────────┘
```

### 6.4 Implementation Steps

#### 6.4.1 Repository Structure
Option A — Monorepo (recommended):
```
faahm/
├── apps/
│   ├── web/           ← public site (existing)
│   └── admin/         ← admin panel (new)
├── packages/
│   ├── database/      ← shared types, Supabase client
│   ├── ui/            ← shared components
│   └── config/        ← shared eslint, tsconfig
└── turbo.json
```

Option B — Separate repos:
```
faahm-web/    (existing)
faahm-admin/  (new)
```

**Recommendation: Monorepo with Turborepo.** Easier shared code, single CI/CD, atomic database migrations.

#### 6.4.2 New Vercel Project
- Name: `faahm-admin`
- Domain: `admin.faahm.com`
- Environment variables: separate from public project
- `SUPABASE_SERVICE_ROLE_KEY`: only here (not in public project)

#### 6.4.3 DNS Setup
- A record: `admin.faahm.com` → Vercel IP
- Cloudflare orange-cloud proxy enabled
- HTTPS forced, HSTS preloaded

#### 6.4.4 Cookie Domain Strategy
- Public site cookies: `Domain=faahm.com` (works on `www.faahm.com`)
- Admin cookies: `Domain=admin.faahm.com` (scoped to subdomain only)
- **No shared sessions** — admin must log in separately on `admin.faahm.com`
- Benefit: Student session leak ≠ admin compromise

#### 6.4.5 Strict CSP for Admin
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

#### 6.4.6 Action-Level Audit Logging
Upgrade audit log to capture not just page views, but every mutation:

```typescript
// Server action wrapper
async function loggedAction<T>(
  actionName: string,
  payload: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  await service.from('admin_audit_log').insert({
    user_id: currentUserId,
    action: actionName,
    metadata: { payload, result_summary: summarize(result) },
    ip: getClientIp(),
    user_agent: getUserAgent(),
  });
  return result;
}

// Usage:
await loggedAction('course.publish', { course_id }, async () => {
  return supabase.from('courses').update({ is_published: true }).eq('id', course_id);
});
```

Events to log:
- `course.create`, `course.update`, `course.publish`, `course.unpublish`, `course.delete`
- `chapter.create`, `chapter.delete`, `chapter.reorder`
- `lesson.create`, `lesson.update`, `lesson.delete`, `lesson.set_free_preview`
- `user.role_changed`, `user.banned`, `user.unbanned`
- `payment.refunded`
- `subscription.cancelled_manually`, `subscription.granted_manually`
- `coupon.created`, `coupon.disabled`
- `admin.created`, `admin.removed`
- `audit_log.viewed`, `audit_log.exported`

#### 6.4.7 Rate Limiting
- Login endpoint: 5 attempts per 15 min per IP, then 1 hour lockout
- API endpoints: 100 req/min per user
- Bulk operations: 10/min per user
- Use Upstash Redis (free tier) or Vercel KV

```typescript
// Pseudo-code
const limit = await rateLimit.check({ key: `login:${ip}`, max: 5, window: '15m' });
if (!limit.success) return new Response('Too many attempts', { status: 429 });
```

#### 6.4.8 Stronger Session Management
- Admin session timeout: 4 hours absolute, 30 min idle
- Refresh tokens rotated on every request
- Force re-auth for sensitive actions: payment refunds, role changes, bulk deletes
- Concurrent session limit: 2 (logs out oldest if exceeded)

### 6.5 Migration Plan

| Week | Tasks |
|---|---|
| 1 | Set up monorepo structure, move admin code to `apps/admin/` |
| 2 | Create new Vercel project, set env vars, wire DNS |
| 3 | Implement shared cookie strategy, test cross-domain auth |
| 4 | Add action-level audit logging to all mutations |
| 5 | Implement rate limiting on critical endpoints |
| 6 | Add CSP headers, test no breakage |
| 7 | Penetration testing (internal red team) |
| 8 | Rollout: switch DNS, deprecate `/admin` routes on public site |

---

## 7. Phase 3: Zero-Trust (Cloudflare Access)

### 7.1 Status: Planned — +4 weeks after Phase 2

### 7.2 Goal

Add Cloudflare Access as a gateway in front of `admin.faahm.com`. Even if our Next.js app has a vulnerability, the attacker must first pass Cloudflare's identity check.

### 7.3 What is Cloudflare Access?

A zero-trust gateway that sits in front of any hostname. Before any request reaches our origin, Cloudflare:
- Checks the user's identity (via Google/GitHub/email OTP)
- Enforces 2FA if configured
- Validates against access policies (IP, country, device posture)
- Issues a short-lived JWT that travels to our origin as a header
- Logs every access attempt

**Pricing**: Free for up to 50 users. We need ~5 max.

### 7.4 Implementation

#### 7.4.1 Cloudflare Zero Trust Setup
1. Enable Zero Trust on Cloudflare dashboard (free)
2. Add `admin.faahm.com` as a protected application
3. Configure identity provider: One-Time PIN (email-based, simplest)
4. Optional upgrade: Google Workspace / GitHub SSO

#### 7.4.2 Access Policies

**Policy 1: Email allowlist** (mandatory)
```
Action: Allow
Include:
  - Emails: ibrahim@digitalsolutionegy.com, [other admins]
Require:
  - Authentication method: One-Time PIN
```

**Policy 2: 2FA mandatory** (mandatory)
```
Require:
  - Multi-factor: Hardware key OR TOTP
```

**Policy 3: IP allowlist** (recommended)
```
Require:
  - IP in: [admin office IP, home IP, VPN IP]
Exception: emergency access via "service token" (rotated quarterly)
```

**Policy 4: Geographic restriction** (optional, sensitive)
```
Require:
  - Country: Egypt, Saudi Arabia, UAE
Deny: All other countries
```

**Policy 5: Device posture** (advanced, Phase 4)
```
Require:
  - WARP client installed AND
  - Disk encrypted AND
  - OS up to date
```

#### 7.4.3 Session Configuration
- Session duration: 8 hours (then re-auth)
- Idle timeout: 1 hour
- Refresh: silent re-auth via Cloudflare cookies if all checks still valid

#### 7.4.4 Origin Verification
Our Next.js app should verify the Cloudflare JWT to ensure requests came through the gateway:

```typescript
// middleware additional check
const cfJwt = request.headers.get('Cf-Access-Jwt-Assertion');
if (!cfJwt) {
  return new Response('Direct access not allowed', { status: 403 });
}

const verified = await verifyCloudflareJwt(cfJwt, {
  audience: process.env.CF_ACCESS_AUD,
  teamDomain: 'faahm.cloudflareaccess.com',
});

if (!verified) {
  return new Response('Invalid access token', { status: 403 });
}
```

This prevents bypassing Cloudflare by hitting the Vercel deployment URL directly.

#### 7.4.5 Cloudflare Tunnel (Optional Enhancement)
- Replaces public Vercel URL with a private tunnel
- Origin server has no public IP / no DNS record
- Only reachable via Cloudflare's network
- Eliminates entire class of attacks (port scans, direct IP exploits)

### 7.5 User Experience

```
1. Admin visits admin.faahm.com
2. Cloudflare intercepts → "Sign in to continue"
3. Admin enters email → receives 6-digit code
4. Enters code → 2FA prompt (TOTP from Authenticator app)
5. Enters TOTP → Cloudflare validates IP, country, device
6. All checks pass → forwarded to our app
7. Our app verifies CF JWT → loads Supabase session
8. Standard login form appears
9. Admin enters Faahm credentials → role check → dashboard
```

**Total time to access**: ~30 seconds.
**Total layers attacker must defeat**: 4 (email → 2FA → IP → password+role).

---

## 8. Authentication & Identity

### 8.1 Admin Account Creation

#### 8.1.1 No Self-Signup
- Admins can ONLY be created by existing super admins
- No "register" path leads to admin role
- The first admin (bootstrap) is created via SQL migration (one-time)

#### 8.1.2 Account Lifecycle
- Create: super-admin invites via email
- Activate: invited user sets password + enables 2FA
- Deactivate: super-admin marks `is_active = false` (preserves audit log)
- Delete: only super-admin can permanently delete, after 30-day soft delete

### 8.2 Password Policy

| Rule | Value |
|---|---|
| Minimum length | 12 characters |
| Required complexity | At least 1 upper, 1 lower, 1 number, 1 symbol |
| Forbidden | Common passwords (HaveIBeenPwned check), email/name substrings |
| Rotation | Every 90 days (Phase 3) |
| History | Cannot reuse last 5 passwords |
| Reset link expiry | 1 hour |

### 8.3 Multi-Factor Authentication

#### 8.3.1 MVP — Not implemented
Acceptable risk for solo admin with strong password.

#### 8.3.2 V1.0 — TOTP via Authenticator App
- Supabase Auth supports TOTP enrollment
- QR code shown on first login after upgrade
- Backup codes generated (10 single-use)
- Required for: every login

#### 8.3.3 V2.0 — Hardware Keys (YubiKey)
- WebAuthn / FIDO2
- Recommended for: super-admins
- Mandatory for: production database access

### 8.4 Session Tokens

| Property | Value |
|---|---|
| Access token TTL | 15 minutes |
| Refresh token TTL | 4 hours absolute, 30 min idle |
| Storage | HttpOnly cookies (not localStorage) |
| Attributes | `Secure; HttpOnly; SameSite=Strict; Domain=admin.faahm.com` |
| Rotation | On every refresh |
| Revocation | Immediate on logout, role change, or password reset |

### 8.5 Account Recovery

- "Forgot password" sends email to registered address only
- Requires 2FA token to complete reset
- All sessions revoked after password reset
- Notification email sent to all admin's addresses on file
- 24-hour cooldown after reset before reset can be requested again

---

## 9. Authorization & Roles

### 9.1 Current Roles (MVP)

| Role | Description | Capabilities |
|---|---|---|
| `student` | Default for all signups | Read own data, browse courses, take lessons (if subscribed) |
| `admin` | Full administrative access | Everything |

### 9.2 Future Roles (V2.0)

| Role | Description | Capabilities |
|---|---|---|
| `super_admin` | Owner/founder | Create/delete admins, change roles, view audit logs |
| `content_admin` | Manages courses | CRUD courses/chapters/lessons; cannot touch users/payments |
| `billing_admin` | Manages payments | View payments, issue refunds, manage coupons; cannot edit content |
| `support_admin` | Customer service | View users, reset passwords, view subscriptions; cannot delete or refund |
| `instructor` | Outside teachers | CRUD own courses only; cannot publish (requires super_admin approval) |
| `student` | End users | (unchanged) |

### 9.3 RLS Policies (Postgres)

Every table enforces RLS at the database level:

```sql
-- Example: only admins can write to courses
CREATE POLICY "admins_full_courses" ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'content_admin')
    )
  );

-- Example: students see only published courses
CREATE POLICY "students_read_published_courses" ON courses
  FOR SELECT
  USING (is_published = true);
```

### 9.4 Permission Matrix (V2.0)

| Resource | super_admin | content_admin | billing_admin | support_admin | instructor | student |
|---|---|---|---|---|---|---|
| Read courses | ✅ | ✅ | ✅ | ✅ | own | published |
| Create courses | ✅ | ✅ | ❌ | ❌ | ✅ (draft) | ❌ |
| Publish courses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete courses | ✅ | ✅ | ❌ | ❌ | own (draft) | ❌ |
| Read users PII | ✅ | ❌ | own payments | ✅ | ❌ | own |
| Change user role | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View payments | ✅ | ❌ | ✅ | summary | ❌ | own |
| Issue refunds | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage coupons | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 10. Audit Logging

### 10.1 What to Log

Every action must capture:
- **Who**: user_id, email, role at time of action
- **What**: action type + affected resource(s)
- **When**: server timestamp (UTC)
- **Where**: IP address, geolocation (Cloudflare provides)
- **How**: user agent, request ID

### 10.2 Schema

```sql
CREATE TABLE admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text,           -- denormalized (user may be deleted later)
  user_role       text,           -- role at time of action

  action          text NOT NULL,  -- e.g. 'course.publish'
  resource_type   text,           -- e.g. 'course'
  resource_id     uuid,           -- the affected entity

  payload         jsonb,          -- before/after for updates
  result          text,           -- 'success' | 'failure'
  error_message   text,

  ip              inet,
  country         text,           -- from CF-IPCountry header
  user_agent      text,
  request_id      text,           -- for cross-system correlation
  session_id      text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_time ON admin_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action_time ON admin_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_time ON admin_audit_log(created_at DESC);
```

### 10.3 Immutability

- No UPDATE or DELETE permitted via API (RLS denies)
- Writes only via service-role key (server-side)
- Logs retained 7 years (compliance buffer)
- Logical deletion via separate `archived` flag, never hard delete
- Optional: stream to external log sink (BetterStack, S3) for tamper-proofing

### 10.4 Admin UI for Audit

`/admin/audit-log` page (super_admin only):
- Filters: user, action, date range, IP, result
- Search: full-text in payload
- Export: CSV download (logged as `audit_log.exported`)
- Real-time tail: last 50 events live-updating

### 10.5 Anomaly Detection (V2.0)

Trigger alerts for:
- 10+ failed admin logins in 5 min
- Admin login from new country
- Admin login from new IP (outside allowlist)
- Bulk operations (>50 deletes in one action)
- Audit log queried by non-super-admin (escalation attempt?)
- Off-hours admin activity (defined by admin's settings)

Alert channels: Slack #security, email, SMS (critical).

---

## 11. Session Management

### 11.1 Login Flow

```
1. User submits email + password to admin.faahm.com/login
2. Server: rate limit check (5/15min/IP)
3. Server: Supabase signInWithPassword()
4. Server: check is_active flag
5. Server: check role IN admin roles
6. Server: if 2FA enabled, prompt for TOTP
7. Server: verify TOTP
8. Server: create session, set HttpOnly cookie
9. Server: log auth_success to audit log
10. Redirect to /admin
```

### 11.2 Per-Request Validation

```
For every /admin/* request:
1. Extract session cookie
2. Validate JWT signature & expiry
3. Fetch user profile (cached 60s)
4. Verify role still in admin roles
5. Verify is_active still true
6. Check IP matches session creation IP (if strict mode)
7. Refresh access token if approaching expiry
8. Pass to route handler
```

### 11.3 Logout

- Explicit: button click → revoke server-side session + clear cookies
- Implicit: 30 min idle → soft logout (require password to continue)
- Forced: role change, password change, "log out everywhere" → all sessions revoked
- Suspicious: 5+ failed auth on the session → revoke + email notification

### 11.4 Concurrent Sessions

| Setting | Default | Max |
|---|---|---|
| Devices per admin | 2 | 5 |
| Behavior on exceed | Oldest session logged out | (configurable) |
| Notification | Email "new device login" | Required |

---

## 12. Anti-Abuse & Rate Limiting

### 12.1 Rate Limits

| Endpoint | Limit | Window | Penalty |
|---|---|---|---|
| `/login` | 5 attempts | 15 min per IP | 1-hour lockout |
| `/api/admin/*` | 100 req | 1 min per user | 429 response |
| Bulk mutations | 10 ops | 1 min per user | 429 response |
| Audit log queries | 30 req | 1 min per user | 429 response |
| Password reset | 3 req | 24 hours per email | Block |
| 2FA verification | 5 attempts | 15 min per user | Lock account, email alert |

### 12.2 IP Reputation

- Block known Tor exit nodes (toggle setting)
- Block known VPN/proxy IPs (configurable allowlist for admins on VPN)
- Block IPs flagged by AbuseIPDB

### 12.3 Bot Protection

- Cloudflare Turnstile on `/login` form (replaces captcha)
- Triggered after 1st failed login from an IP
- Blocks 99% of automated brute force

### 12.4 Honeypots

- Fake hidden form fields named `username` and `website`
- Bots auto-fill these → request rejected silently
- Logged as `bot_detected` for analysis

---

## 13. Data Protection

### 13.1 At Rest

- Supabase Postgres: AES-256 encryption (default)
- Backups: encrypted, 7-day retention + PITR
- Audit logs: never deleted; exported to cold storage after 1 year

### 13.2 In Transit

- HTTPS only (TLS 1.3 preferred, 1.2 minimum)
- HSTS preloaded (`max-age=63072000; includeSubDomains; preload`)
- Certificate transparency monitoring
- No HTTP redirects to HTTPS — HTTP refuses connection entirely

### 13.3 Secrets Management

| Secret | Storage | Rotation |
|---|---|---|
| Supabase service role key | Vercel env (encrypted) | Quarterly |
| Paymob secret key | Vercel env | Quarterly |
| Stripe secret key | Vercel env | Quarterly |
| Cloudflare API token | Vercel env | Quarterly |
| Admin TOTP secrets | Supabase Auth (encrypted) | On password reset |
| Database password | Supabase managed | Annually |

Rotation procedure:
1. Generate new secret
2. Add as new env var (don't remove old yet)
3. Deploy with new var
4. Verify
5. Remove old var
6. Verify still working
7. Log rotation in audit log

### 13.4 PII Handling

- User PII visible in admin panel: email, name, phone (if collected), payment history
- PII NOT collected: addresses, ID numbers, dates of birth (unless legally required)
- Access logged: every admin view of user detail page logged
- Bulk export: requires super_admin role + email approval workflow

---

## 14. Incident Response

### 14.1 Severity Levels

| Severity | Examples | Response Time | Who |
|---|---|---|---|
| **P0 Critical** | Confirmed admin account compromise, data leak, payment manipulation | 15 minutes | All hands |
| **P1 High** | Suspicious admin activity, repeated brute force, security advisory in dependency | 1 hour | Security lead + owner |
| **P2 Medium** | Failed login spike, weird traffic patterns | 4 hours | On-call |
| **P3 Low** | Routine alerts, audit log oddities | 24 hours | Next business day |

### 14.2 Runbook: Suspected Admin Compromise

```
1. Within 1 min:
   - Revoke all sessions for the affected account
   - Force password reset
   - Disable account if behavior is clearly malicious

2. Within 5 min:
   - Review audit log for last 7 days for that user_id
   - Check for any privilege escalations or unusual mutations
   - Snapshot Supabase database (point-in-time)

3. Within 15 min:
   - Notify other admins via secure channel (Signal, not Slack)
   - Rotate all secrets (Supabase keys, Paymob, Stripe)
   - Block compromised IP at Cloudflare

4. Within 1 hour:
   - Determine scope: what data was accessed, what was changed
   - If user data accessed → prepare breach notification
   - If financial: notify Paymob/Stripe for investigation

5. Within 24 hours:
   - Restore any corrupted data from backup
   - Document timeline + root cause
   - Notify affected users per legal requirements

6. Within 7 days:
   - Post-mortem
   - Implement preventive measures
   - Update this runbook
```

### 14.3 Communication Templates

Pre-written templates for:
- User notification of data breach
- Press statement (if breach is public)
- Internal team announcement
- Stripe/Paymob fraud report

Stored in: secure shared password manager, NOT in repo.

### 14.4 Backups

- Supabase: daily automated, 7-day retention (Pro tier)
- Manual snapshot before major operations (admin trains for this)
- Tested restore: quarterly drill
- Backup storage: separate Supabase project for cold storage

---

## 15. Compliance

### 15.1 Egyptian Data Protection Law (Law 151/2020)

| Requirement | Status |
|---|---|
| Lawful basis for processing | Documented in Privacy Policy |
| User consent for data collection | Cookie banner + Terms acceptance |
| Right to access (data export) | UI in settings (Phase 2) |
| Right to deletion | UI in settings (Phase 2) |
| Data Protection Officer | Designated: owner (small org exception) |
| Cross-border data transfer | Disclosed (Supabase = AWS Frankfurt) |
| Breach notification | Within 72 hours to PDPC |
| Records of processing | Maintained in this PRD + Privacy Policy |

### 15.2 GDPR (Best Effort)

Same as above, plus:
- Children under 16: explicit parental consent (we restrict to 16+ TOS)
- Right to portability: JSON export
- Right to rectification: self-serve in settings

### 15.3 PCI DSS

- Scope: SAQ-A (we never touch card data — Paymob/Stripe handles)
- Card data: never logged, never stored, never transmitted through our servers
- Annual self-assessment: required by Paymob
- Document evidence: kept in compliance folder

### 15.4 SOC 2 (Future, when B2B sales)

If selling to enterprise (V1.5+):
- Audit logs become evidence
- Access controls become controls
- Incident response becomes a process
- 6-month observation period before audit
- Estimated cost: $20-50K for first audit

---

## 16. Testing & Validation

### 16.1 Automated Security Tests

#### 16.1.1 Static Analysis (CI)
- `npm audit` on every PR
- Dependabot for vulnerable dependencies
- Semgrep for code patterns (hardcoded secrets, SQL injection)
- Snyk Code (free for open source)

#### 16.1.2 Dynamic Tests
- Authentication flow tests (Playwright)
- Role-based access tests (every endpoint × every role)
- Rate limit tests
- CSRF token validation

#### 16.1.3 Integration Tests
- RLS policies verified per role
- Audit log entries created for sample actions
- Session expiry behaves correctly

### 16.2 Manual Pentests

#### 16.2.1 Internal Red Team (Before Each Phase Launch)
Checklist:
- [ ] Can a student account access `/admin`?
- [ ] Can `/admin` be discovered via Google? Search engines?
- [ ] Does `/admin` leak existence via timing? (404 vs 403 difference)
- [ ] Can session cookie be stolen via XSS?
- [ ] Can CSRF attack force admin to delete a course?
- [ ] Can rate limits be bypassed via IP rotation?
- [ ] Are audit logs queryable by a non-admin?
- [ ] Does the password reset flow leak whether an email exists?
- [ ] Is the Supabase service role key reachable from any client-side bundle?
- [ ] Can the unlock cookie (Phase 1) be guessed/brute forced?

#### 16.2.2 External Pentest (V1.0)
- Engage a security firm (Egyptian firms: Edge Security, FORENSCO; international: HackerOne)
- Scope: admin.faahm.com + APIs
- Frequency: annually
- Budget: $3-8K per engagement

### 16.3 Bug Bounty (V1.5+)

- HackerOne or local platform
- Scope: production admin + APIs
- Rewards: $50-$5,000 by severity
- Safe harbor for researchers in Terms

---

## 17. Monitoring & Alerting

### 17.1 Metrics to Track

| Metric | Threshold | Action |
|---|---|---|
| Failed admin logins / hour | >20 | Slack alert |
| 403 responses on /admin / hour | >50 | Slack alert |
| 500 errors on /admin / hour | >10 | PagerDuty + Slack |
| Audit log writes / hour | 0 (during business hours) | PagerDuty (logs may be broken) |
| Admin logins from new country | Any | Email alert to admin |
| Concurrent admin sessions | >5 per user | Email alert |
| Service role key usage spike | >50% over baseline | Slack alert |
| Database connection pool | >80% used | Slack alert |

### 17.2 Dashboards

- **Security dashboard** (Grafana or Supabase logs):
  - Failed logins (time series)
  - Geographic distribution of admin logins
  - Top admin actions
  - 4xx/5xx error rates on /admin

- **Audit log explorer** (in-app):
  - Live tail
  - Filtered queries
  - Export

### 17.3 Tools

| Tool | Purpose | Cost |
|---|---|---|
| Sentry | Error monitoring | $26/mo |
| BetterStack | Uptime + log aggregation | $20/mo |
| Cloudflare Security Analytics | Network-layer threats | Free |
| Supabase Logs | DB + Auth logs | Included |
| Slack (free tier) | Alert delivery | Free |
| PagerDuty (free tier) | Critical alerts | Free up to 5 users |

---

## 18. Implementation Checklist

### 18.1 Phase 1 (Done ✅)
- [x] Role check in middleware
- [x] Role check in admin layout
- [x] Remove admin link from public navbar
- [x] Remove admin link from student dashboard
- [x] Add X-Robots-Tag headers
- [x] Add robots.txt disallow
- [x] Create admin_audit_log table
- [x] Log admin page accesses

### 18.2 Phase 2 (Planned)
- [ ] Convert to monorepo (apps/web + apps/admin)
- [ ] Create new Vercel project for admin
- [ ] Set up admin.faahm.com DNS
- [ ] Cookie domain scoping per app
- [ ] Add CSP headers to admin app
- [ ] Action-level audit logging wrapper
- [ ] Rate limiting on /login (Upstash Redis)
- [ ] Rate limiting on /api/admin/*
- [ ] Session timeout: 30 min idle, 4 hr absolute
- [ ] Concurrent session limit: 2 devices
- [ ] "Sign out everywhere" button
- [ ] Email notification on new device login
- [ ] Force re-auth for sensitive actions
- [ ] Audit log UI in admin
- [ ] Internal pentest
- [ ] DNS cutover

### 18.3 Phase 3 (Planned)
- [ ] Cloudflare Zero Trust account setup
- [ ] Add admin.faahm.com as Access application
- [ ] Configure identity provider (email OTP minimum)
- [ ] Email allowlist policy
- [ ] Mandatory 2FA policy
- [ ] IP allowlist policy
- [ ] Geographic restriction (optional)
- [ ] CF JWT verification in Next.js middleware
- [ ] Service token for emergency access
- [ ] Cloudflare Tunnel (optional)
- [ ] Update incident runbook
- [ ] External pentest
- [ ] Document all access policies in security wiki

### 18.4 V2.0 Enhancements
- [ ] Granular roles (super_admin, content_admin, billing_admin, support_admin)
- [ ] Permission matrix enforcement at RLS layer
- [ ] Hardware key (WebAuthn) support
- [ ] Password rotation enforcement (90 days)
- [ ] Anomaly detection (off-hours, new country)
- [ ] Bug bounty program launch
- [ ] SOC 2 prep (if B2B)

---

## 19. Cost Analysis

### 19.1 Phase 1 (Done)
- Implementation: 16 hours (done)
- Ongoing: $0/month

### 19.2 Phase 2
- Implementation: ~80 hours of dev
- Additional services:
  - Second Vercel project: $0 (within Pro plan)
  - Upstash Redis (rate limiting): $0-10/mo
  - Monorepo migration: one-time effort
- Ongoing: $0-10/month

### 19.3 Phase 3
- Implementation: ~40 hours of dev
- Additional services:
  - Cloudflare Access (≤50 users): $0/mo
  - Cloudflare Access (>50 users): $7/user/mo
  - WARP client device posture: included
- Ongoing: $0-7/month for typical small team

### 19.4 Optional/V2.0
- External pentest: $3-8K annually
- Bug bounty payouts: variable
- SOC 2 audit: $20-50K (first year)
- YubiKeys for admins: $50/admin once

### 19.5 Total Recommended Annual Investment

| Tier | Annual Cost | When to Choose |
|---|---|---|
| **Minimum** (Phase 1+2) | $120/yr | Pre-launch, <1k users |
| **Standard** (Phase 1+2+3) | $200/yr | Post-launch, 1k-10k users |
| **Mature** (+ pentest) | $5,000/yr | 10k+ users, paying customers |
| **Enterprise-ready** (+ SOC 2) | $30,000/yr | Selling to enterprise |

---

## 20. Appendices

### Appendix A: Glossary

| Term | Definition |
|---|---|
| **2FA / MFA** | Two-Factor / Multi-Factor Authentication |
| **CSP** | Content Security Policy |
| **HSTS** | HTTP Strict Transport Security |
| **PII** | Personally Identifiable Information |
| **RLS** | Row-Level Security (Postgres) |
| **TOTP** | Time-based One-Time Password |
| **WAF** | Web Application Firewall |
| **WebAuthn** | Web Authentication standard for hardware keys |
| **Zero Trust** | Security model: never trust, always verify |
| **Service Token** | Long-lived API token for machine-to-machine auth |
| **PITR** | Point-In-Time Recovery |

### Appendix B: References

- [OWASP Top 10](https://owasp.org/Top10/)
- [Cloudflare Zero Trust docs](https://developers.cloudflare.com/cloudflare-one/)
- [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Egyptian Data Protection Law (Law 151/2020)](https://www.dataguidance.com/notes/egypt-data-protection-overview)
- [GDPR](https://gdpr-info.eu/)

### Appendix C: Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| May 2026 | Use Cloudflare Access over Vercel Password Protection | Free tier, identity provider integration, better UX |
| May 2026 | Email OTP as initial 2FA, TOTP for V1.0 | Email is universal; TOTP adds security |
| May 2026 | Monorepo over separate repos | Shared types, easier atomic migrations |
| May 2026 | Skip "secret unlock URL" approach | Was added Phase 1 but caused friction; replaced with subdomain isolation in Phase 2 |
| May 2026 | Audit logs immutable, 7-year retention | Legal + compliance buffer |
| May 2026 | Service role key only on admin project | Limits blast radius if public project compromised |

### Appendix D: Open Questions

1. Should we restrict admin access to Egypt-only IPs in Phase 3, or allow any country with strong 2FA?
2. How do we handle emergency admin access if Cloudflare Access has an outage?
3. Should we adopt hardware keys (YubiKey) for owner/super-admin in Phase 3?
4. What's the policy when an admin leaves the company — credentials, audit log retention, refresh?
5. Should we encrypt the audit log payload field at rest (defense against insider DB access)?
6. Do we need a separate "read-only admin" role for accountants/auditors?

### Appendix E: Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Product Owner | Ibrahim | | |
| Security Lead | TBD | | |
| Engineering Lead | TBD | | |
| Legal Counsel | TBD | | |

---

**End of Document**
