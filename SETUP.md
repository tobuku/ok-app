# Setup Guide

## 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. From **Settings > API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. From **Settings > Database > Connection string**, copy the URI format:
   - Paste into `DATABASE_URL` (replace `[YOUR-PASSWORD]` with your DB password)
   - Use the **Transaction pooler** (port 6543) for serverless/Vercel

## 2. Local Environment

1. Copy `.env.example` to `.env` and fill in the Supabase values.
2. Install dependencies:
   ```
   npm install
   ```
3. Generate Prisma client and run migrations:
   ```
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Create test users in Supabase Auth (see step 3 below), then update `prisma/seed.ts` with their Auth UIDs.
5. Run the seed:
   ```
   npx tsx prisma/seed.ts
   ```

## 3. Create Test Users in Supabase Auth

Go to **Supabase Dashboard > Authentication > Users > Add User** and create 6 users:

| Email                        | Password     | Notes                |
|------------------------------|-------------|----------------------|
| admin@opalakuleana.com       | testpass123 | Org A — ORG_ADMIN    |
| dispatch@opalakuleana.com    | testpass123 | Org A — DISPATCHER   |
| lead@opalakuleana.com        | testpass123 | Org A — LEADMAN      |
| admin@islandhaulers.com      | testpass123 | Org B — ORG_ADMIN    |
| dispatch@islandhaulers.com   | testpass123 | Org B — DISPATCHER   |
| lead@islandhaulers.com       | testpass123 | Org B — LEADMAN      |

After creating each user, copy their **User UID** from the Supabase dashboard and paste it into the corresponding `authUid` field in `prisma/seed.ts`.

## 4. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) and import the `tobuku/ok-app` GitHub repo.
2. Set the **Framework Preset** to `Next.js`.
3. Add all environment variables from `.env.example` in **Settings > Environment Variables**.
4. Use the **production** Supabase connection string for `DATABASE_URL` (same project, same string).
5. Every `git push origin main` will auto-deploy.

## 5. Run the App

```
npm run dev
```

Open http://localhost:3000/login

## 6. Run Isolation Tests

```
npm test
```

These tests verify that Org A users cannot read or write Org B data (and vice versa). They run against your real database, so seed data must exist.
