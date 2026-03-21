# Pinly Deployment

Pinly is ready to deploy on Vercel with PostgreSQL and Prisma. This document covers the production path and the remaining caveats.

## Required Vercel Environment Variables
- `DATABASE_URL`
  - Production PostgreSQL connection string for runtime queries
- `DIRECT_URL`
  - Direct PostgreSQL connection string for Prisma migrations
- `AUTH_SECRET`
  - Random 32+ byte secret for Auth.js session signing
- `AUTH_URL`
  - Production app URL, same value as `NEXTAUTH_URL`
- `STORAGE_DRIVER`
  - Set to `vercel-blob` in production
- `BLOB_READ_WRITE_TOKEN`
  - Vercel Blob token for media uploads
- `BLOB_ACCESS_MODE`
  - Keep this at `private` so media stays behind app authorization

## Recommended Vercel Environment Variables
- `NEXTAUTH_URL`
  - Set this to the production app URL (same value as `AUTH_URL`)
- `GOOGLE_CLIENT_ID`
  - Optional, required only if enabling Google auth
- `GOOGLE_CLIENT_SECRET`
  - Optional, required only if enabling Google auth
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`
  - Optional fallback flag for UI visibility when provider discovery fails
- `MAX_UPLOAD_SIZE_MB`
  - Keep this at `4` for server uploads on Vercel
- `BLOB_UPLOAD_PREFIX`
  - Optional folder prefix, default is `posts`
- `AUTH_DEBUG_RESET_LINKS`
  - Optional local-only password reset preview. Leave unset or `false` outside development.
- `ALLOW_DESTRUCTIVE_SEED`
  - Leave unset in production; only use `pinly-demo` for intentional demo or staging reseeds

## Database Setup
1. Create the production PostgreSQL database.
2. Copy the runtime connection string into `DATABASE_URL`.
3. Copy the direct migration connection string into `DIRECT_URL`.
4. Ensure both URLs include `sslmode=require`.
5. In Prisma, runtime queries use `DATABASE_URL`; schema migrations use `DIRECT_URL`.

## Prisma Commands
Local dev:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Production-safe schema deploy:
```bash
npm run prisma:migrate:deploy
```

Avoid using `prisma db push` against production unless you intentionally want schema drift outside migrations.
This repo now includes a checked-in baseline migration under `prisma/migrations/`.

## Vercel Setup
1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add the required environment variables.
4. Create or connect a Vercel Blob store and copy `BLOB_READ_WRITE_TOKEN`.
5. Set `BLOB_ACCESS_MODE=private`.
6. Set the build command to the default project build or leave it blank so Vercel uses `npm run build`.
7. Run `npm run prisma:migrate:deploy` against the production database before first launch.
8. Deploy.

If enabling Google auth, configure OAuth redirect URIs in Google Cloud:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://<your-domain>/api/auth/callback/google`

## Production Caveats
- Vercel server uploads are small-request friendly. Keep uploads short and keep `MAX_UPLOAD_SIZE_MB` at `4` unless you move to client-side uploads.
- Nominatim place search is good for prototype scale, but it is not the final production-grade places provider if usage grows.
- Do not run the destructive seed script against production data. The public demo login now bootstraps the reserved demo dataset non-destructively on first use, so production demo access does not rely on `npm run prisma:seed`.
- `STORAGE_DRIVER=local` is only for local development. Vercel production should use `vercel-blob`.
- Public images are now allowlisted in `next.config.ts`; new remote media hosts must be added there before use.

## Launch Checklist
- [ ] Production PostgreSQL database created
- [ ] `DATABASE_URL` set to the runtime connection string
- [ ] `DIRECT_URL` set to the direct migration connection string
- [ ] `AUTH_SECRET` set
- [ ] `AUTH_URL` set to production domain
- [ ] `STORAGE_DRIVER=vercel-blob`
- [ ] `BLOB_READ_WRITE_TOKEN` set
- [ ] `BLOB_ACCESS_MODE=private`
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `npm run prisma:migrate:deploy` executed successfully
- [ ] Upload flow tested in production
- [ ] Sign in, add friend, create post, map browse, and feed browse smoke-tested

For the full go-live runbook, rollback notes, and manual QA scenarios, use [GO_LIVE.md](/Users/kalebwong/Library/CloudStorage/OneDrive-WilfridLaurierUniversity/TravelMediaFolder/GO_LIVE.md).
For exact first-deploy command order and failure-mode fixes, use [FIRST_DEPLOY_EXECUTION_PLAN.md](/Users/kalebwong/Library/CloudStorage/OneDrive-WilfridLaurierUniversity/TravelMediaFolder/FIRST_DEPLOY_EXECUTION_PLAN.md).
