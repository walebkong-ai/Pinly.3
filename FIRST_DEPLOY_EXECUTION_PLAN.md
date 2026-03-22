# FIRST DEPLOY EXECUTION PLAN

Target stack: Vercel + Neon Postgres + Prisma + Vercel Blob.

## 1. Setup Order (Do This First)
1. Create Neon production project/database.
2. Create Vercel project from this repo.
3. Create or attach a Vercel Blob store.
4. Set Vercel environment variables before first deploy (see list below).
5. Run Prisma migration deploy against production database.
6. Deploy app to Vercel.
7. Run immediate production verification checklist.

## 2. Local Commands Before First Deploy
Run in repo root:

```bash
npm install
python3 tools/check_env.py
npm run type-check
npm test
AUTH_SECRET=testsecret NEXTAUTH_URL=http://localhost:3000 AUTH_URL=http://localhost:3000 DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pinly?schema=public DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pinly?schema=public npm run build
```

If you want to validate Prisma schema config with explicit URLs:

```bash
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pinly?schema=public DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pinly?schema=public npx prisma validate
```

## 3. Vercel Environment Variables (Production)
Required:
- `DATABASE_URL` = Neon pooled URL (runtime queries)
- `DIRECT_URL` = Neon direct URL (migrations)
- `AUTH_SECRET` = strong random string
- `NEXTAUTH_URL` = `https://<your-production-domain>`
- `AUTH_URL` = `https://<your-production-domain>`
- `BLOB_READ_WRITE_TOKEN` = Vercel Blob RW token

Recommended:
- `BLOB_ACCESS_MODE` = `private`
- `BLOB_UPLOAD_PREFIX` = `posts`
- `MAX_UPLOAD_SIZE_MB` = `4`
- `RATE_LIMIT_DRIVER` = unset
- `ALLOW_DESTRUCTIVE_SEED` = unset in production
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (only if enabling Google auth)
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` (optional fallback for Google button visibility)

## 4. Prisma Command Order (Generate / Migrate / Seed)
Production first deploy:
1. `npm run prisma:generate`
2. `npm run prisma:migrate:deploy`
3. Do not run seed in production unless you intentionally want demo data.

Staging/demo environment (optional seed):
1. `npm run prisma:generate`
2. `npm run prisma:migrate:deploy`
3. `ALLOW_DESTRUCTIVE_SEED=pinly-demo npm run prisma:seed`

Local development:
1. `npm run prisma:generate`
2. `npm run prisma:migrate`
3. `npm run prisma:seed`

## 5. Immediate Post-Deploy Verification
1. Open production app and create a fresh user account.
2. Sign out/sign in and confirm session persists after refresh.
3. Confirm map opens on world view with city clusters.
4. Upload one image post and one short video post.
5. Confirm both appear on map and feed for visible users.
6. Verify friend request send/accept path with a second account.
7. Verify non-friend cannot open protected post directly.

# KNOWN FIRST-DEPLOY FAILURE MODES

1. Build succeeds but app errors on first DB query.
- Likely cause: `DATABASE_URL` missing/invalid or SSL mode mismatch.
- Fix: set Neon pooled connection string in `DATABASE_URL`, include `sslmode=require`, redeploy.

2. `prisma migrate deploy` fails in production.
- Likely cause: `DIRECT_URL` missing/wrong or permissions mismatch.
- Fix: set Neon direct connection string in `DIRECT_URL`, rerun `npm run prisma:migrate:deploy`.

3. Auth fails with host/secret errors.
- Likely cause: missing `AUTH_SECRET`, missing domain URL env.
- Fix: set `AUTH_SECRET`, set both `NEXTAUTH_URL` and `AUTH_URL` to production domain, redeploy.

4. Upload endpoint returns storage misconfigured errors.
- Likely cause: missing `BLOB_READ_WRITE_TOKEN`.
- Fix: set token, confirm Blob store attached to project, redeploy.

5. Uploads fail for larger files.
- Likely cause: serverless request body limit.
- Fix: keep uploads short, keep `MAX_UPLOAD_SIZE_MB=4`, retry with smaller files.

6. Place search intermittently fails.
- Likely cause: Nominatim availability/rate limits.
- Fix: retry after delay; for sustained production scale, move to paid places provider.

7. Remote image URLs fail to render.
- Likely cause: host not allowlisted in Next.js image config.
- Fix: add host to `next.config.ts` `images.remotePatterns`, redeploy.

8. Seed command refuses to run on Neon.
- Likely cause: safety guard for non-local DB.
- Fix: only for intentional demo/staging reseed run `ALLOW_DESTRUCTIVE_SEED=pinly-demo npm run prisma:seed`. Do not use in production.

# MINIMUM PRODUCTION QA SCRIPT

Use two accounts: `User A`, `User B`, and one non-friend account `User C`.

1. Auth flow
- Sign up `User A`.
- Sign out.
- Sign in as `User A`.
- Refresh browser and confirm session remains.

2. Friend request flow
- Sign up `User B`.
- As `User A`, search `User B` and send request.
- As `User B`, accept request.
- Confirm both see each other as friends.

3. Map first-open world view
- As `User A`, open map tab.
- Confirm first visible state is world map with city clusters and minimal UI.

4. City cluster progression
- Zoom in.
- Confirm progression: city cluster -> place cluster -> standard pin -> profile bubble.
- Confirm same-place multiple posts stay grouped until closest zoom.

5. Popup -> bottom sheet -> full page flow
- Tap a visible marker.
- Confirm popup preview appears first.
- Expand to bottom sheet.
- Open full post page from bottom sheet.

6. Filters
- Open filter button and sidebar.
- Confirm `All Time` is default.
- Apply time filter and confirm result set changes.
- Apply groups/category filters and confirm result set changes.

7. Friends / You / Both toggle
- Set `You` and confirm only own posts are shown.
- Set `Friends` and confirm only friend posts are shown.
- Set `Both` and confirm union is shown.

8. Create post with place search
- Upload image.
- Search place, select result, complete form, publish.
- Confirm post appears on map and feed.

9. Create post with map tap
- Upload short video.
- Tap map to set location, complete fields, publish.
- Confirm post appears on map and feed.

10. Upload image
- Validate image upload returns success and post can be created.

11. Upload short video
- Validate short video upload returns success and post can be created.

12. Feed tab
- Open feed tab and confirm recent visible posts appear.
- Confirm map is still default primary tab.

13. Non-friend access protection
- Sign in as `User C` (not a friend).
- Attempt direct access to `User A` post URL.
- Confirm protected post is not returned.
