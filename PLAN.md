# Junk Removal SaaS Platform — Build Plan (Multi-Tenant, White-Label, Internal-Only)

A complete specification for building a **multi-tenant, white-label SaaS platform** for junk removal companies: phone-intake scheduling and dispatch, onsite quoting with before/after photos, and cash/card payments with dual email receipts. You operate it first for your own company (tenant #1, e.g. OpalaKuleana.com), then sell subscriptions to other junk removal companies.

---

## 1. Product Overview

**What it is:** A SaaS platform where each junk removal company is an **Organization (tenant)** with its own users, jobs, customers, pricing, branding, and payments — fully isolated from every other tenant. Surfaces sharing one backend:

- **Web dashboard** — Dispatcher and Org Admin
- **Mobile app (PWA)** — Leadman onsite
- **Platform console** — you (platform owner) manage all tenant organizations

**Core loop per tenant:** Customer calls the company → Dispatcher checks the schedule and books an on-site quote visit (**no quotes over the phone — ever**) → Leadman arrives, photographs junk, builds the quote onsite → Customer accepts → work done → after-photos → Payment collected (cash or card, **into the tenant's own Stripe account**) → White-labeled invoice receipt emailed automatically to the customer **and to the company's email** → Org Admin sees everything for their company; you see platform-wide health.

### Product principle #1 — Internal-only
This is an internal operations tool, controlled entirely by the company. There is **no customer-facing booking, no request form, no customer portal, no customer accounts, and no self-service of any kind.** All intake happens by phone to the Dispatcher. All quotes happen on site only.

### Product principle #2 — White-label
The customer experiences **the junk removal company's brand, never the platform's.** Example: a customer finds OpalaKuleana.com on their own, calls, and books. Onsite, the Leadman presents the quote acceptance screen (on a phone or laptop) showing the **OpalaKuleana logo**. The Stripe payment page shows **OpalaKuleana's** business name (it's their connected Stripe account, so the card statement descriptor is theirs too). The invoice receipt email carries **OpalaKuleana's logo and name**, sent on behalf of the company. The platform's own name/brand appears nowhere in the customer experience — at most, a customer who inspects the URL might notice the platform's domain. (Per-tenant custom domains that hide even that are a later premium feature.)

The **only** things a customer ever touches:
1. The onsite quote acceptance screen (tenant-branded), handed to them by the Leadman
2. The Stripe payment page (tenant's Stripe account)
3. The invoice receipt email (tenant-branded)

**Business model:** Monthly subscription per organization (tiered by users or jobs/month), optionally plus a small platform fee per card transaction via Stripe Connect. Tenant acquisition is **invite-only/manual at first** — a public marketing/signup funnel is a deliberately deferred, separate effort.

---

## 2. Tenancy Model (the most important design decision)

- **Single database, shared schema, `orgId` on every tenant-owned table.** Simplest to build and operate; standard for SaaS at this stage.
- **Every query is scoped by `orgId` — enforced in one place** (a Prisma middleware / query helper), never ad hoc per route. This is the #1 source of catastrophic SaaS bugs (data leaking between tenants); centralize it and test it.
- Users belong to exactly one org (v1). Platform staff are flagged separately and belong to no org.
- URL structure: single platform domain; org resolved from the logged-in user's session. Per-tenant custom subdomains/domains = later premium feature (completes the white-label).
- **Tenant isolation tests are mandatory:** automated tests that log in as Org A and attempt to read/write Org B's jobs, photos, customers, quotes — all must fail.

---

## 3. Roles & Permissions

Two levels: **platform** roles (you) and **organization** roles (each company's staff).

| Capability | Leadman | Dispatcher | Org Admin | Platform Admin (you) |
|---|---|---|---|---|
| View own assigned jobs | ✅ | ✅ (org) | ✅ (org) | ✅ (any org, support mode) |
| Before/after photos, onsite quotes, collect payment | ✅ | — | ✅ | — |
| Create/schedule/reassign jobs; customers; dispatch map; dump coordination | — | ✅ | ✅ | — |
| Manage org users & roles | — | — | ✅ | — |
| Edit org price book & branding (logo, receipts email) | — | — | ✅ | — |
| Org reports, revenue, exports | — | — | ✅ | — |
| Connect org's Stripe account; manage subscription | — | — | ✅ | — |
| Create/suspend organizations | — | — | — | ✅ |
| Platform metrics (MRR, active orgs, usage) | — | — | — | ✅ |
| Support-access an org (audit-logged) | — | — | — | ✅ |
| Platform config: plans, pricing, feature flags | — | — | — | ✅ |

Auth: email + password. Role and `orgId` live on the user record; **both are enforced server-side on every endpoint.** Platform Admin access to tenant data always writes an AuditLog entry.

---

## 4. Core User Flows

### 4.1 Tenant Onboarding (invite-only for now)
1. **You create the Organization from the Platform Console** and invite the first Org Admin by email. (No public signup page for now — a marketing funnel is a separate later project.)
2. Org Admin completes a guided setup wizard: company name, **logo (white-label branding)**, timezone, service area, **company receipts email**, seed a default price book (editable), invite dispatcher & leadmen, connect Stripe account (Stripe Connect onboarding link), pick subscription plan (with 7-day free trial).
3. Org is live; trial banner shows days remaining; card required to continue after trial.

### 4.2 Dispatcher — Create & Schedule Job (all intake is by phone)
1. Customer calls in. **No pricing or quotes are given over the phone** — the dispatcher's job is to look at the schedule and book the truck + crew for an **on-site quote visit**.
2. Create/find Customer, create Job: service address (geocoded), date/time window, notes, assigned leadman, status = `SCHEDULED`.
3. Job board (kanban by status), calendar view, map view with pins — all scoped to the org.
4. Reassign/reschedule/cancel; changes notify the leadman.

### 4.3 Leadman — Onsite Quote & Completion
1. Mobile PWA → today's jobs → job detail (address opens in Maps).
2. **On Site** → timestamped. **Before photos** via camera.
3. **Quote builder:** truck-load fraction (min, 1/8 … full) priced from the *org's* price book + add-ons (mattress, appliance, tires, stairs, heavy material) + discount w/ reason. Live total.
4. Customer-facing **Accept / Decline** screen — **tenant-branded (company logo, no platform branding)** — works on the Leadman's phone or a laptop; optional signature.
5. Work done → **after photos** → **Complete** → payment.

### 4.4 Payment (per-tenant money via Stripe Connect)
- **Card:** Stripe Checkout / Payment Link created **on the org's connected Stripe account** — the payment page shows the company's business name; funds go directly to the tenant company; card statement descriptor is theirs; platform optionally takes an application fee. Leadman presents it on his phone/laptop, or shows a QR / texts / emails the link.
- **Cash:** **"Paid Cash" button** for the Leadman + amount received; recorded.
- **Both:** automatic **white-labeled invoice receipt email** (company logo, company name, quote breakdown, payment method, amount) — sent to the **customer** and simultaneously to the **company's receipts email** (set on the Organization). Job → `PAID`.
- Refunds: Org Admin can refund card payments (Stripe refund via connected account).

### 4.5 Dump Coordination (per org)
Dump sites (name, address, hours, accepted materials, fee notes) and Dump Runs (truck, site, time, weight/fee, linked jobs) — tracks dump costs against revenue.

### 4.6 Org Admin
Org-wide dashboards: revenue, jobs by status, quote conversion, leadman performance, dump costs; user management; price book; **branding settings (logo, receipts email)**; Stripe connection; subscription & billing portal (Stripe Customer Portal); CSV exports; org audit log.

### 4.7 Platform Admin (you)
Platform console: create orgs & invite Org Admins, list/search orgs, plan & status (trialing/active/past-due/suspended), MRR and usage metrics, suspend/reactivate, support-access into an org (audit-logged), manage plans/pricing/feature flags, platform-wide error/health view.

---

## 5. Recommended Tech Stack & Hosting

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + TypeScript** | One repo: dashboard, PWA, platform console, API |
| Mobile strategy | **PWA** | No app-store friction for v1; native (Expo) later as premium/mobile upgrade |
| Database | **PostgreSQL** (Supabase or Neon) | Relational + row-level security option for tenant isolation |
| ORM | **Prisma** with a **tenant-scoping middleware** | Centralized `orgId` enforcement |
| Auth | **Supabase Auth** (or NextAuth) | Email/password; JWT carries userId; role+orgId loaded server-side |
| File storage | **Supabase Storage / S3** — keys prefixed `org/{orgId}/…` | Tenant-scoped photos & logos |
| Customer payments | **Stripe Connect (Standard accounts)** | Each org connects its own Stripe; money & statement descriptor are theirs; optional platform application fee |
| SaaS billing | **Stripe Billing** (subscriptions + Customer Portal) | Your revenue: plans, trials, dunning handled by Stripe |
| Email | **Resend** + React Email | White-labeled receipts (per-org logo/name), invites, trial reminders |
| Maps | **Google Maps JS API** (or Mapbox) | Dispatch map, geocoding |
| UI | **Tailwind + shadcn/ui** | Fast, mobile-friendly |
| Code repo | **GitHub** | Version control; Claude Code works directly with it |
| Hosting | **Vercel, connected to the GitHub repo** | Auto-deploys on every push; free tier to start |

> ⚠️ **Hosting note:** GitHub is for the **repository only**. **GitHub Pages cannot host this app** — it serves static files and cannot run the server, API routes, database connections, or Stripe webhooks this platform requires. Connect the GitHub repo to **Vercel** for hosting; every `git push` then deploys automatically.

**Two distinct Stripe integrations — don't conflate them:**
1. **Stripe Connect** = tenants collecting money from *their* customers (white-labeled to the tenant).
2. **Stripe Billing** = *you* collecting subscription money from tenants.

---

## 6. Data Model (Prisma-style outline)

Platform-level tables (no orgId): `Organization`, `Plan`, `Subscription`, `PlatformUser`, `FeatureFlag`.
**Every other table carries `orgId`** and is covered by the tenant-scoping middleware.

```
Organization  id, name, slug, logoKey?, timezone, receiptsEmail, status
              (TRIALING|ACTIVE|PAST_DUE|SUSPENDED|CANCELED),
              stripeConnectAccountId?, stripeCustomerId?, trialEndsAt, createdAt
Plan          id, name, priceCentsMonthly, maxUsers?, maxJobsPerMonth?, features(json), active
Subscription  id, orgId, planId, stripeSubscriptionId, status, currentPeriodEnd
User          id, orgId, name, email, phone,
              role (LEADMAN|DISPATCHER|ORG_ADMIN), active, invitedAt, createdAt
PlatformUser  id, name, email, role (PLATFORM_ADMIN), active

Customer      id, orgId, name, phone, email, notes
Address       id, orgId, customerId, line1, line2, city, state, zip, lat, lng
Job           id, orgId, jobNumber (unique per org), customerId, addressId, status,
              scheduledDate, timeWindowStart/End, assignedToId, truckId?, notes,
              source (PHONE|REFERRAL|REPEAT|OTHER), createdById,
              enRouteAt, onSiteAt, completedAt, canceledAt, cancelReason
JobStatus     NEW | SCHEDULED | EN_ROUTE | ON_SITE | QUOTED | ACCEPTED |
              DECLINED | IN_PROGRESS | COMPLETED | PAID | CANCELED
Photo         id, orgId, jobId, type (BEFORE|AFTER), storageKey, takenById, takenAt
PriceBook     id, orgId, name, active
PriceItem     id, orgId, priceBookId, kind (LOAD_FRACTION|ADDON|FEE), label,
              fraction?, amountCents, sortOrder, active
Quote         id, orgId, jobId, status (DRAFT|PRESENTED|ACCEPTED|DECLINED),
              subtotalCents, discountCents, discountReason, taxCents, totalCents,
              acceptedAt, declinedReason, signatureKey?
QuoteLine     id, orgId, quoteId, priceItemId?, label, qty, unitCents, totalCents
Payment       id, orgId, jobId, quoteId, method (CARD|CASH),
              status (PENDING|SUCCEEDED|FAILED|REFUNDED), amountCents,
              applicationFeeCents?, stripeSessionId?, stripePaymentIntentId?,
              receivedById, paidAt
EmailLog      id, orgId?, jobId?, to, template, status, sentAt
Truck         id, orgId, name, capacityCubicYards, active
DumpSite      id, orgId, name, address, hours, acceptedMaterials, feeNotes, active
DumpRun       id, orgId, truckId, dumpSiteId, runAt, weightLbs?, feeCents?, notes
DumpRunJob    dumpRunId, jobId
AuditLog      id, orgId?, actorUserId?, actorPlatformUserId?, action, entity,
              entityId, meta(json), createdAt
```

Money = integer cents. All mutations write AuditLog. Composite indexes start with `orgId`.

---

## 7. API Surface

All `/api/org/*` routes: authenticated, org-scoped, role-checked. All `/api/platform/*` routes: Platform Admin only.

```
# Tenant onboarding & billing (invite-only: orgs are created by Platform Admin)
POST   /api/org/setup                    (Org Admin completes wizard: branding, receiptsEmail, price book)
POST   /api/org/stripe/connect           (Stripe Connect onboarding link)
POST   /api/org/billing/checkout         (subscribe to plan)
GET    /api/org/billing/portal           (Stripe Customer Portal link)
POST   /api/webhooks/stripe-billing      (subscription status → Organization.status)
POST   /api/webhooks/stripe-connect      (tenant payment events → Payment/Job)

# Operations (org-scoped)
GET/POST      /api/org/jobs              PATCH /api/org/jobs/:id
POST   /api/org/jobs/:id/status         (guarded transitions)
POST   /api/org/jobs/:id/photos         (signed upload, org-prefixed key)
POST   /api/org/jobs/:id/quote
POST   /api/org/quotes/:id/present|accept|decline
POST   /api/org/jobs/:id/pay/cash
POST   /api/org/jobs/:id/pay/card       (Checkout session on connected account)
GET/POST/PATCH /api/org/customers
GET/PATCH     /api/org/pricebook         (Org Admin)
PATCH  /api/org/branding                 (Org Admin: logo, receiptsEmail)
GET/POST/PATCH /api/org/users            (Org Admin)
GET    /api/org/dumpsites, /api/org/dumpruns
GET    /api/org/reports/summary

# Platform console
GET    /api/platform/orgs                POST /api/platform/orgs   (create + invite Org Admin)
PATCH  /api/platform/orgs/:id            (suspend/reactivate/plan override)
POST   /api/platform/orgs/:id/support-access   (audit-logged)
GET    /api/platform/metrics             (MRR, active orgs, jobs volume)
GET/PATCH /api/platform/plans
```

Middleware chain on every org route: authenticate → load user → resolve orgId → check org status (block if SUSPENDED; read-only if PAST_DUE) → check role → scope all queries.

---

## 8. Screens

### Mobile PWA (Leadman) — `/m/*`
Today · Job detail · Photos (before/after) · Quote builder · **Present quote (tenant-branded, customer-facing moment)** · Payment (card link/QR or Paid Cash) · Done. Company logo in header.

### Web Dashboard (Dispatcher / Org Admin) — `/app/*`
Job board · Calendar · Map · Job editor · Customers · Dump coordination · *(Org Admin adds:)* Overview/reports · Users · Price book · **Branding (logo, receipts email)** · Billing & Stripe connection · Audit log.

### Onboarding wizard — `/onboarding/*`
Org details & branding → price book seed → invite team → connect Stripe → choose plan/trial. Reached via Platform Admin invite (no public signup).

### Platform Console (you) — `/platform/*`
Orgs list & detail · Create org + invite Org Admin · Metrics (MRR, usage) · Plans editor · Feature flags · Support access.

### Deferred — public marketing/signup site
A public marketing funnel for selling the SaaS is a **separate later project** (it targets junk removal companies, never their customers). Not part of this build. A simple login page is all the public web presence the platform needs for now.

---

## 9. Build Phases

**Phase 0 — Multi-Tenant Foundation** ⚠️ do not shortcut
Scaffold Next.js + TS + Tailwind + Prisma + Supabase; GitHub repo connected to Vercel. Full schema with `orgId`. **Tenant-scoping Prisma middleware + tenant isolation test suite.** Auth, role+org middleware, org status gate. Seed: 2 test orgs with users in each role.
*Done when: users in Org A can log in and provably cannot touch Org B data (tests pass), and pushes to GitHub auto-deploy.*

**Phase 1 — Jobs & Scheduling**
Customer + Job CRUD, job board, calendar, assignment, guarded status transitions, leadman Today view.
*Done when: dispatcher schedules; leadman progresses the job on a phone; both scoped to their org.*

**Phase 2 — Photos & Quotes**
Photo capture/upload to org-prefixed storage, per-org price book, quote builder, **tenant-branded** present/accept/decline screen.
*Done when: full onsite flow works end-to-end with the company logo on the customer-facing screen.*

**Phase 3 — Payments (Stripe Connect) & White-Label Receipts**
Org Stripe Connect onboarding, card via Checkout on connected account (+ optional application fee), Paid Cash flow, webhook → PAID, **white-labeled invoice receipt email to customer + company receipts email**, EmailLog.
*Done when: a test org connects Stripe and both payment paths produce a PAID job, a branded customer receipt, and a copy in the company inbox.*

**Phase 4 — Dispatch Ops & Org Admin**
Map view, dump sites/runs, org reports, org user management, price book editor, branding settings, org audit log, CSV export.
*Done when: an Org Admin can run their company end-to-end.*

**Phase 5 — SaaS Billing (invite-only)**
Platform-Admin org creation + Org Admin email invites, onboarding wizard, Plans + Stripe Billing subscriptions, 7-day trial, Customer Portal, dunning states (PAST_DUE read-only, SUSPENDED blocked).
*Done when: you can create an org, invite its admin, and they can set up, trial, and pay you — no code changes per tenant.*

**Phase 6 — Platform Console**
Org management, metrics (MRR, active orgs, jobs volume), support access (audit-logged), plan/flag editing.
*Done when: you can administer the whole platform from the console.*

**Phase 7 — Polish & Premium Features**
PWA offline caching, SMS notifications (Twilio), signature capture, invoice-later links, **per-tenant custom domains (completes white-label)**, public marketing/signup funnel (if/when wanted), native app (Expo) evaluation, per-org data export.

> Note: You can run **your own company on it from Phase 3** while Phases 5–6 (selling it) are built. You are tenant #1 and your daily use is the best QA.

---

## 10. SaaS-Specific Requirements (don't skip)

- **Tenant isolation tests** in CI — every entity, cross-org read AND write attempts.
- **Terms of Service & Privacy Policy** before onboarding external companies (you're storing their customer PII and photos). Have a template lawyer-reviewed.
- **Data export & deletion** per org (offboarding/churn; also a selling point).
- **Backups**: automated Postgres backups + tested restore (a tenant's data is their business).
- **Rate limiting** on auth endpoints.
- **Error monitoring** (Sentry) tagged with orgId.
- **Feature flags** table from day one — lets you sell tiers (e.g., map view = Pro).
- **Usage metering** (jobs/month per org) if plans are usage-limited.
- Stripe Connect **Standard** accounts (tenant owns the Stripe relationship, least liability for you) — confirm vs Express during Phase 3.

---

## 11. Key Decisions & Assumptions (locked unless explicitly changed)

1. **Internal-only — locked in.** No customer-facing booking, request forms, portals, or self-service, now or in the roadmap. All intake is by phone to the Dispatcher; all quotes happen on site only, never over the phone. Customers touch only: the onsite acceptance screen, the Stripe payment page, and the receipt email. Do not build anything customer-facing without an explicit change to this plan.
2. **White-label — locked in.** Every customer touchpoint carries the tenant company's branding (logo, name, Stripe statement descriptor, receipt email identity). The platform's brand never appears in the customer experience; at most the platform domain is visible in the URL. Per-tenant custom domains later complete this.
3. **Multi-tenant from Phase 0** — locked in.
4. **Invite-only tenant acquisition** for now; public marketing/signup funnel is a deferred, separate project (Phase 7 at earliest).
5. **Shared schema + orgId** (not database-per-tenant) — right for this scale.
6. **PWA over native** for v1; native app is a Phase 7 / premium consideration.
7. **Volume-based pricing** (truck fractions) seeded as default price book; each org customizes.
8. **Stripe Connect Standard** + optional application fee; **Stripe Billing** for subscriptions.
9. **GitHub = repo, Vercel = hosting.** GitHub Pages is not used (static-only; cannot run this app).
10. Plans: 2–3 tiers (e.g., Solo / Crew / Pro) — define before Phase 5, not before.
11. Single timezone per org (stored on Organization).
12. Sales tax: per-org flat rate field in v1 (Hawaii GET for tenant #1); proper tax engine later if needed.

---

## 12. Environment Variables

```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=                    # platform account (Billing + Connect)
STRIPE_WEBHOOK_SECRET_BILLING=
STRIPE_WEBHOOK_SECRET_CONNECT=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
EMAIL_FROM="Receipts <receipts@yourplatformdomain.com>"   # display name is overridden per-org
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
APP_URL=
SENTRY_DSN=
```

---

## 13. How to Use This Plan in Claude Code

1. Create a GitHub repo; add this file as `PLAN.md` + the `CLAUDE.md` below at the root.
2. One phase at a time. First prompt:
   > "Read PLAN.md. Execute Phase 0 exactly: scaffold per section 5, implement the full multi-tenant schema from section 6, build the tenant-scoping Prisma middleware, auth with org+role resolution, and the tenant isolation test suite. Seed two test orgs with one user per role each. Stop after Phase 0 and show me how to run the isolation tests."
3. **Never advance a phase until its *done-when* passes** — especially Phase 0's isolation tests.
4. Highest-risk areas to demand tests for: tenant scoping, job status transitions, both Stripe webhooks.
5. Connect the repo to Vercel early (Phase 0) so every push deploys and you can test on a real phone.

### Starter CLAUDE.md

```markdown
# Project: Junk Removal SaaS (multi-tenant, white-label, internal-only)
Read PLAN.md before any work. Follow its tenancy model, data model, API surface, and phases.

## Non-negotiable rules
- INTERNAL-ONLY: never build customer-facing booking, request forms, portals, or self-service. Customers only ever see: the onsite quote acceptance screen, the Stripe payment page, and the receipt email.
- WHITE-LABEL: every customer-visible surface (acceptance screen, payment, receipt email) shows the tenant org's logo/name, never the platform's.
- EVERY tenant-owned query goes through the org-scoping helper in lib/tenant.ts — never raw prisma.* for tenant tables
- Role AND org checks are server-side on every route; org status gate (SUSPENDED/PAST_DUE) applies
- Money is integer cents; format only at display
- Every mutation writes AuditLog; platform support-access is always audit-logged
- Job status changes only via the transition guard in lib/status.ts
- Storage keys are prefixed org/{orgId}/
- Two Stripe integrations kept separate: lib/stripe-connect.ts (tenant payments) and lib/stripe-billing.ts (our subscriptions)
- Prisma migrations for all schema changes; secrets only via env vars
- Hosting is Vercel via GitHub; never target GitHub Pages

## Layout
- app/m/*          leadman PWA
- app/app/*        dispatcher + org admin dashboard
- app/platform/*   platform console
- app/onboarding/* invite-only setup wizard
- app/login        the only public page

## Commands
- dev: npm run dev
- db: npx prisma migrate dev / npx prisma studio
- test: npm test   (isolation tests must always pass)

## Current phase
Phase 0 (update as phases complete)
```

---

## 14. Rough Effort Estimate

| Phase | Est. sessions in Claude Code |
|---|---|
| 0 (multi-tenant foundation) | 2 |
| 1 Jobs & scheduling | 2–3 |
| 2 Photos & quotes | 2–3 |
| 3 Connect payments & white-label receipts | 2–3 |
| 4 Org admin & dispatch ops | 3–4 |
| 5 SaaS billing (invite-only) | 2 |
| 6 Platform console | 2 |
| 7 Polish | ongoing |

Realistically: **~3–5 weeks part-time** to run your own company on it (Phases 0–4), then **~1–2 more weeks** to onboard other paying companies (Phases 5–6).
