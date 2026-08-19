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
Phase 1 complete — Jobs & Scheduling (Phase 2 next: Photos & Quotes)
