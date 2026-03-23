# Pinly — App Review Guide

> For Apple App Review, Google Play Review, and internal QA.

## Demo Account

| Field | Value |
|-------|-------|
| Email | `avery@pinly.demo` |
| Password | `password123` |

**Quick access:** Visit `/sign-in?demo=1` — demo data is auto-seeded and you're signed in immediately.

Alternatively, tap **"Continue as demo user"** on the sign-in screen.

Five demo users are pre-seeded with posts, friendships, and pending friend requests so the app is populated on first launch.

---

## Key Features to Test

| Feature | Path | Notes |
|---------|------|-------|
| Map (core) | `/map` | Pan, zoom, tap markers, filter by date/friends |
| Create memory | `/create` | Upload photo, pick location, add caption |
| Feed | `/feed` | Scrollable timeline + "On This Day" section |
| Profile | `/profile/me` | Own profile, travel summary, post grid |
| Friends | `/friends` | Send/accept requests, view pending |
| Settings | `/settings` | Profile photo, like counts, comments toggle |
| Report user | Profile → ⋯ → Report | Category picker + detail text |
| Block user | Profile → ⋯ → Block | Removes friendship, hides content |
| Delete account | `/settings` or `/delete-account` | Type DELETE to confirm; demo accounts are protected |
| Collections | `/collections` | Create/manage place collections |
| Messages | `/messages` | Direct messaging between friends |

---

## Legal & Privacy

| Document | URL |
|----------|-----|
| Terms of Service | `/terms` |
| Privacy Policy | `/privacy` |
| Account Deletion | `/delete-account` |

The `/delete-account` page works for both authenticated and unauthenticated users (directs to sign-in first if needed). Use this URL in your store listing's account deletion field.

---

## Sign in with Apple

Apple requires Sign in with Apple (Guideline 4.8) **only if** a third-party social login is present.

- **Google OAuth** is behind the `GOOGLE_CLIENT_ID` environment variable
- If the env var is **not set**, Google sign-in is hidden and only email/password is shown
- **For initial iOS submission with email-only auth, no Sign in with Apple is needed**
- If you later enable Google OAuth, you must also add Sign in with Apple via the NextAuth Apple provider

---

## Content Rating

- No user-generated mature content controls beyond report/block
- No gambling, alcohol, or violent content
- Recommended rating: **4+** (iOS) / **Everyone** (Android)
- Report categories: Harassment, Spam, Inappropriate Content, Other

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth session encryption |
| `GOOGLE_CLIENT_ID` | No | Enables Google OAuth (triggers Apple sign-in requirement on iOS) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | No | Shows Google button in UI |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | No | Satellite map tiles |
| `DEMO_SEED_SECRET` | No | Protects `/api/demo/seed` in production |
