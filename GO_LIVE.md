# Pinly Go-Live Readiness

This runbook is for the first real Pinly deployment on Vercel with Neon Postgres, Prisma, and Supabase Storage.

## Pre-Deploy Checklist
- [ ] `DATABASE_URL` points to the Neon pooled runtime URL
- [ ] `DIRECT_URL` points to the Neon direct connection URL
- [ ] `AUTH_SECRET` is a strong random secret
- [ ] `NEXTAUTH_URL` matches the production domain
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `SUPABASE_STORAGE_BUCKET=media` (or your chosen public bucket)
- [ ] `RATE_LIMIT_DRIVER` is unset in production
- [ ] `MAX_UPLOAD_SIZE_MB=4`
- [ ] `npm run type-check` passes locally
- [ ] `npm test` passes locally
- [ ] `npm run build` passes locally with production-like env vars
- [ ] `npm run e2e` passes locally or in CI
- [ ] `python3 tools/check_env.py` shows all required vars set
- [ ] `npm run prisma:migrate:deploy` has been tested against a non-production Neon branch or staging database
- [ ] Nobody plans to run `npm run prisma:seed` against production

## First Deploy Checklist
1. Create the Neon production database and copy both connection strings.
2. Import the repo into Vercel.
3. Add all required Vercel environment variables before the first deploy.
4. Connect or create the Supabase Storage bucket and verify the media env vars.
5. Run `npm run prisma:migrate:deploy` against production.
6. Trigger the first Vercel deployment.
7. Open the deployed app and complete the post-deploy verification list below before sharing it.

## Post-Deploy Verification Checklist
- [ ] `Explore the demo` signs in and lands on `/map` with demo data visible
- [ ] Sign up works for a new account
- [ ] Sign in works and the session persists across refresh
- [ ] Feed tab loads for an authenticated user
- [ ] Friend search returns matching usernames
- [ ] Friend request send and accept flows both work
- [ ] Uploading a small image works
- [ ] Uploading a small video works
- [ ] New post creation succeeds from place search
- [ ] New post creation succeeds from map tap
- [ ] Map loads on the world view with no geolocation prompt
- [ ] City clusters are the first visible map state
- [ ] Zoom progression behaves correctly across world, city, pin, and bubble stages
- [ ] Popup preview opens from a marker
- [ ] Bottom sheet expands from the popup flow
- [ ] Full post page opens from the bottom sheet
- [ ] Time, groups, and category filters change the map result set
- [ ] `Friends / You / Both` changes visible markers correctly
- [ ] Non-friend access to protected posts is rejected

## Rollback / Recovery Notes
### Prisma migration failure
- Do not rerun ad hoc `prisma db push` against production.
- Fix the migration locally or on a Neon branch first.
- Re-run `npm run prisma:migrate:deploy` after the corrected migration is committed.

### Upload failures
- Check `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, and `MAX_UPLOAD_SIZE_MB`.
- If uploads suddenly fail in production, verify that Supabase Storage is reachable, the bucket is public, and the service role key has not been rotated or removed.
- If needed, roll back to the previous Vercel deployment while keeping the database unchanged.

### Auth/session failures
- Verify `AUTH_SECRET` and `NEXTAUTH_URL`.
- If sign-in breaks immediately after deploy, compare the active env vars in Vercel with `.env.example`.
- Roll back the Vercel deployment first if the issue is application code, not environment configuration.

### Neon connectivity failures
- Verify `DATABASE_URL` uses the pooled URL and `DIRECT_URL` uses the direct URL.
- Confirm the database is reachable and not paused or rate-limited.
- Roll back the app deployment only if the issue came from a code/config change rather than Neon service availability.

## Minimum Manual QA Flows
### Map-first product
1. Open the app after signing in.
2. Confirm the first view is a world map with city clusters only.
3. Zoom in once and confirm the minimal UI reveals search, filters, add-post, and friend activity.
4. Continue zooming and confirm the progression is `city cluster -> place cluster -> standard pin -> profile bubble`.
5. Confirm multiple posts at the same place stay grouped until the closest zoom.

### Post interaction
1. Tap a visible marker.
2. Confirm a popup preview appears first.
3. Expand into the bottom sheet.
4. Open the full post page from the bottom sheet.

### Filters and layers
1. Open the filter sidebar.
2. Confirm `All Time` is the default.
3. Apply a time filter and confirm the marker set changes.
4. Apply a lightweight group filter and confirm the marker set narrows.
5. Apply a category filter and confirm the marker set narrows.
6. Switch between `Friends`, `You`, and `Both` and confirm visibility changes are correct.

### Create post
1. Create a post using place search.
2. Create a post using map tap plus the place fields.
3. Confirm each new post appears on the map under the correct privacy rules.

### Privacy
1. Sign in as a user who is not an accepted friend of the post creator.
2. Attempt to open the protected post URL directly.
3. Confirm the API/page denies access.

### Optional Google auth (if enabled)
1. Confirm Google OAuth env vars are set (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
2. If buttons do not show in production, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and redeploy.
3. On sign-in and sign-up screens, confirm the Google button is visible.
4. Complete Google sign-in and confirm the app lands on `/map` with a valid session.
