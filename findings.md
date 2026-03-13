# Findings

## Workspace State
- Initialized on 2026-03-13
- Repository was empty at start
- Base directories created: `architecture/`, `tools/`, `.tmp/`

## Constraints
- No scripts should be added to `tools/` until Blueprint prerequisites are met
- Business logic must be deterministic and schema-driven
- `.tmp/` is reserved for intermediate artifacts

## Product Decisions
- App name: Pinly
- Platform: Next.js App Router MVP for web
- Auth choice: NextAuth credentials with Prisma-backed users for fast email/password delivery and session persistence
- Database: PostgreSQL via Prisma
- Map choice: Leaflet with OpenStreetMap for fast setup, no mandatory map token, and privacy-friendly static posting UX
- Storage choice: local filesystem storage for runnable local MVP with a Cloudinary-ready abstraction for deployment upgrade

## Research Queue
- Review GitHub repos and related references after discovery clarifies stack and domain

## Helpful References
- Next.js + Prisma + NextAuth examples on GitHub informed the App Router + Prisma auth structure
- Leaflet clustering patterns informed the staged aggregation map implementation after package compatibility testing
- Prisma social app seed patterns informed the normalized friendship and demo data approach

## Verification Findings
- `react-leaflet-cluster` conflicted with `react-leaflet@5`, so clustering was rebuilt with `supercluster`
- `next/font/google` failed in network-restricted build environments, so typography was moved to local font stacks
- Docker is not installed in this workspace, so Postgres bring-up and seed execution could not be completed locally here
- The map layer required a full staged-rendering rebuild rather than incremental patching because the original abstraction only supported generic clusters and single pins
- Local filesystem uploads were the main blocker for Vercel readiness, so storage was upgraded to support `vercel-blob`
- Prisma needed `DIRECT_URL` for migration safety with Neon pooled runtime connections
- Place search currently depends on Nominatim, which is acceptable for prototype scale but is still a production caveat
- The repo needed a checked-in Prisma migration baseline so `prisma migrate deploy` would work on first Neon deployment
- Image remote host allowlisting was too broad for production and needed to be restricted in `next.config.ts`
- The demo seed flow needed an explicit production/non-local safety guard to avoid destructive mistakes during real deployment
- Marker avatar/name HTML in Leaflet `divIcon` needed escaping to avoid malformed markup or script injection from user-provided names/URLs
- Upload route needed multipart parse failure handling so bad/oversized payloads return clear API errors instead of opaque server failures
- Google auth can be added without introducing a separate auth adapter by upserting OAuth users into the existing Prisma `User` model during NextAuth sign-in callbacks
