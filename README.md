# Pinly

Pinly is a private, friends-only social travel MVP built with Next.js, Prisma, PostgreSQL, Auth.js, and MapLibre. Users can sign up, add friends, upload photo or video posts tied to places, and browse those memories on an interactive map.

## Stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS
- Auth.js credentials auth with JWT sessions
- PostgreSQL (Supabase-compatible) + Prisma ORM
- MapLibre + react-map-gl with staged server-side map aggregation
- Supabase Storage uploads with public media URLs

## Why this stack
- Fastest path to a coherent demo in a single deployable app
- Prisma gives strong relational modeling for friendships and protected posts
- Auth.js keeps email/password auth simple without introducing a second backend
- MapLibre avoids mandatory map API keys and keeps the experience privacy-forward

## Features included
- Email/password sign up and sign in
- Optional Google sign up/sign in via NextAuth OAuth
- JWT-backed session persistence
- Username search and friend requests
- Accept/decline friend requests
- Intentional place-based posts with image or video upload
- Friends-only staged memory map
- World city clusters, city hybrid view, pins, and avatar bubbles
- Popup preview to bottom-sheet to full post flow
- Layer toggle for Friends / You / Both
- Default / Satellite map mode on the main map, with optional `NEXT_PUBLIC_MAPTILER_API_KEY` override for MapTiler imagery
- Time filter sidebar
- Feed tab with recent visible posts
- City search and browse
- Post detail page
- Profile page with places summary
- Create-post location selection via place search and map tapping
- Seeded demo dataset with 5 users and 20 posts
- Validation and unit tests for critical permissions and query shapes

## Project structure
```text
app/
  (app)/
    cities/
    create/
    friends/
    map/
    posts/[postId]/
    profile/[username]/
  api/
components/
architecture/
lib/
prisma/
tests/
tools/
```

## Setup
1. Copy `.env.example` to `.env`.
2. Start Postgres:
```bash
docker compose up -d db
```
3. Install dependencies:
```bash
npm install
```
4. Generate Prisma client and apply schema:
```bash
npm run prisma:generate
npm run prisma:migrate
```
5. Seed demo data:
```bash
npm run prisma:seed
```
6. Start the app:
```bash
npm run dev
```
7. If you want to test uploads locally, add real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` values. Pinly now uploads directly to Supabase Storage in every environment, and the server upload path requires the service role key.

## Demo accounts
After seeding, sign in with any of these and password `password123`:
- `avery@pinly.demo`
- `maya@pinly.demo`
- `noah@pinly.demo`
- `elena@pinly.demo`
- `leo@pinly.demo`

The deployed demo no longer depends on running the destructive seed script in production. The first demo sign-in bootstraps the reserved demo dataset non-destructively, and the landing page `Explore the demo` button signs in with the default demo account automatically.

## Environment variables
- `DATABASE_URL`: production PostgreSQL connection string for runtime queries
- `DIRECT_URL`: direct PostgreSQL connection string for migrations
- `AUTH_SECRET`: long random secret for NextAuth JWT signing
- `NEXTAUTH_URL`: local or deployed app URL
- `AUTH_URL`: set this to the same value as `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`: required if enabling Google auth
- `GOOGLE_CLIENT_SECRET`: required if enabling Google auth
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`: optional fallback to show Google button in UI (`true`/`false`)
- `NEXT_PUBLIC_MAPTILER_API_KEY`: optional, switches the satellite basemap to MapTiler; when unset, the app falls back to Esri World Imagery
- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL used for rendering media
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase anon key compiled into the web/native runtime for diagnostics and future client-side integrations
- `SUPABASE_URL`: optional server override for the same Supabase project URL
- `SUPABASE_ANON_KEY`: optional server-side mirror of the anon key for diagnostics; do not use this for uploads
- `SUPABASE_SERVICE_ROLE_KEY`: required for uploads and Supabase media cleanup
- `SUPABASE_STORAGE_BUCKET`: public storage bucket name for Pinly media, defaults to `media`
- `MAX_UPLOAD_SIZE_MB`: upload cap, keep this at `4` for Vercel server uploads
- `RATE_LIMIT_DRIVER`: optional local override. Leave unset to use the database-backed limiter; use `memory` only for short-lived local debugging.
- `AUTH_DEBUG_RESET_LINKS`: optional local-only preview for password reset links; keep `false` outside development
- `ALLOW_DESTRUCTIVE_SEED`: leave unset locally; only use `pinly-demo` for intentional demo/staging reseeds
- `PINLY_DEMO_AVATAR_URL`, `PINLY_DEMO_IMAGE_URL`, `PINLY_DEMO_VIDEO_URL`, `PINLY_DEMO_VIDEO_THUMBNAIL_URL`: optional Supabase-hosted demo media used when seeding sample content
- `PINLY_FALLBACK_AVATAR_URL`, `PINLY_FALLBACK_IMAGE_URL`, `PINLY_FALLBACK_VIDEO_URL`, `PINLY_FALLBACK_VIDEO_THUMBNAIL_URL`: optional Supabase-hosted fallbacks used by `npm run media:repair`

## Useful commands
```bash
npm run dev
npm run build
npm run type-check
npm run test
npm run e2e
npm run prisma:push
npm run prisma:migrate:deploy
npm run prisma:seed
python3 tools/check_env.py
```

## Architecture notes
- Friendship rows are normalized into `userAId` and `userBId` to prevent duplicate relationships.
- Visibility is derived from accepted friendships plus the current user.
- Map queries are bounds-based and zoom-aware so the client only asks for relevant staged markers.
- City discovery reuses the same protected visibility rules as the map.
- Uploads use Supabase Storage in every environment; non-Supabase media is treated as legacy data and should be repaired with `npm run media:repair`.
- Prisma migrations are checked into `prisma/migrations/` so `prisma migrate deploy` can safely bootstrap production PostgreSQL in deployment environments.
- Rate limiting is database-backed by default so auth, upload, and write-heavy routes stay protected across serverless instances.
- Lightweight groups are currently friend-backed filter options and are intentionally structured to support a future persistent group model without changing the map flow.
- Categories are derived from post media type and text cues so the filter system is explicit today without needing a stored taxonomy.

## Tradeoffs
- No live location, background tracking, or automatic map sharing.
- Place search currently uses Nominatim for a lightweight prototype flow.
- No comments, reactions, notifications, or moderation tools.
- Post editing and deletion are not included to keep the prototype tight.
- Server-side uploads on Vercel should stay small. Larger media needs a future client-upload path.

## Deployment
- Production target: Vercel + PostgreSQL + Prisma + Supabase Storage
- Exact deployment steps and the launch checklist live in [DEPLOYMENT.md](./DEPLOYMENT.md)
- Final go-live runbook and manual QA flows live in [GO_LIVE.md](./GO_LIVE.md)
- First live deployment command order and failure-mode playbook live in [FIRST_DEPLOY_EXECUTION_PLAN.md](./FIRST_DEPLOY_EXECUTION_PLAN.md)
- Google OAuth callback URL: `/api/auth/callback/google` (set both local and production origins in Google Cloud)

## Future improvements
- Add a client-side upload path for larger videos
- Add place autocomplete and reverse geocoding
- Add edit/delete post flows
- Add pagination and caching on profile and city views
- Add richer integration tests with a test database
- Add password reset, email verification, and invite flows
