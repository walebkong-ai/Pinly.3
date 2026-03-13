# Pinly Architecture Overview

## Product Intent
Pinly is a private, map-based social travel app centered on intentional place posts. It is explicitly not a live location product.

## Stack Choices
- Frontend: Next.js App Router with TypeScript for a single deployable codebase and fast iteration
- Styling: Tailwind CSS with small local UI primitives to keep the MVP cohesive and easy to evolve
- Auth: NextAuth credentials strategy with JWT sessions, plus optional Google OAuth routed through Prisma user upserts
- Database: Neon PostgreSQL with Prisma for relational modeling of users, friendships, and place-based posts
- Storage: Vercel Blob for production uploads with local filesystem fallback for development
- Map: Leaflet with light raster tiles and stage-aware server-side aggregation for token-free interactive map exploration
- Deployment: Vercel serverless with checked-in Prisma migrations and explicit Node.js route runtime on server APIs

## Core Flows
1. Auth
   - Sign up writes a user record with a hashed password
   - Sign in verifies credentials and persists a JWT-backed session
2. Friend graph
   - Users search by username
   - Pending friend requests can be accepted or declined
   - Accepted requests create a normalized friendship pair to prevent duplicates
3. Posts
   - Users upload image or video media
   - Users enter caption, place, city, country, coordinates, and visit date
   - Posts are only visible to the creator and accepted friends
4. Discovery
   - Map view fetches stage-aware data inside the current viewport
   - World stage shows city clusters only
   - City stage shows a hybrid of city clusters, place clusters, pins, and city context
   - Pin stage shows place clusters and standard pins
   - Bubble stage shows avatar bubbles and only splits same-place groups at the highest zoom
   - City search fetches visible posts filtered by city and optional country
   - Profile view shows a user's own or friend-visible travel history
   - Lightweight groups are friend-backed filter selections for now, structured to support a future persistent group model
   - Categories are derived from post media type and place/caption cues instead of a stored taxonomy

## Privacy Rules
- No background location collection
- No passive or automatic sharing
- Friends-only visibility for MVP
- Posting is an explicit user action with manually provided place context

## MVP Tradeoffs
- Server uploads on Vercel should stay small; larger uploads need a future client-upload flow
- Place search uses a lightweight Nominatim proxy instead of a richer commercial places API
- JWT sessions simplify auth but do not yet support password reset or email verification
- The demo seed is intentionally blocked in production and requires explicit confirmation for non-local databases
