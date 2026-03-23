# Gemini Constitution

## Purpose
This file is the constitutional source for project rules, schemas, and architectural invariants.

## Project Status
- Phase: Architect
- Implementation status: scaffold in progress

## Data Schemas

### Input Schema
- Status: approved
- Shape:
```json
{
  "auth": {
    "signUp": {
      "name": "string",
      "username": "string",
      "email": "string",
      "password": "string",
      "avatarUrl": "string | null"
    },
    "googleOAuth": {
      "email": "string",
      "name": "string | null",
      "avatarUrl": "string | null"
    },
    "signIn": {
      "email": "string",
      "password": "string"
    }
  },
  "friendRequest": {
    "fromUserId": "string",
    "toUserId": "string",
    "status": "\"pending\" | \"accepted\" | \"declined\""
  },
  "postCreate": {
    "mediaType": "\"image\" | \"video\"",
    "mediaUrl": "string",
    "caption": "string",
    "placeName": "string",
    "city": "string",
    "country": "string",
    "latitude": "number",
    "longitude": "number",
    "visitedAt": "ISO date string",
    "thumbnailUrl": "string | null"
  },
  "mapQuery": {
    "north": "number",
    "south": "number",
    "east": "number",
    "west": "number",
    "zoom": "number",
    "layer": "\"friends\" | \"you\" | \"both\"",
    "time": "\"all\" | \"30d\" | \"6m\" | \"1y\"",
    "groups": "string[]",
    "categories": "\"photo\" | \"video\" | \"food\" | \"nature\" | \"landmark\" | \"neighborhood\"[]",
    "city": "string | null",
    "search": "string | null",
    "page": "number | null",
    "pageSize": "number | null"
  }
}
```

### Output Schema
- Status: approved
- Shape:
```json
{
  "sessionUser": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "avatarUrl": "string | null"
  },
  "friendCard": {
    "id": "string",
    "name": "string",
    "username": "string",
    "avatarUrl": "string | null",
    "friendshipCreatedAt": "ISO date string | null",
    "requestStatus": "\"none\" | \"pending_sent\" | \"pending_received\" | \"friends\""
  },
  "postSummary": {
    "id": "string",
    "user": {
      "id": "string",
      "name": "string",
      "username": "string",
      "avatarUrl": "string | null"
    },
    "mediaType": "\"image\" | \"video\"",
    "mediaUrl": "string",
    "thumbnailUrl": "string | null",
    "caption": "string",
    "placeName": "string",
    "city": "string",
    "country": "string",
    "latitude": "number",
    "longitude": "number",
    "visitedAt": "ISO date string",
    "createdAt": "ISO date string"
  },
  "cityResult": {
    "city": "string",
    "country": "string",
    "friendCount": "number",
    "postCount": "number",
    "center": {
      "latitude": "number",
      "longitude": "number"
    },
    "posts": "postSummary[]"
  },
  "mapResponse": {
    "stage": "\"world\" | \"city\" | \"pin\" | \"bubble\"",
    "markers": "cityCluster[] | placeCluster[] | pin[] | profileBubble[]",
    "cityContext": "cityResult | null",
    "friendActivity": "activityItem[]"
  }
}
```

## Behavioral Rules
- Reliability over speed
- Never guess at business logic
- Prefer deterministic tooling for execution paths
- Update this file when schemas, rules, or architecture change

## Architectural Invariants
- Layer 1: `architecture/` contains SOPs and operational rules
- Layer 2: navigation/reasoning routes work across SOPs and tools
- Layer 3: `tools/` contains atomic deterministic Python scripts
- Secrets belong in `.env`
- Intermediate artifacts belong in `.tmp/`
- Production deploy target is Vercel + Neon + Prisma + Supabase Storage
- Prisma schema changes must ship with checked-in migrations for `prisma migrate deploy`
- Destructive demo seeding must never run in production and must require explicit confirmation for non-local databases
- Lightweight groups remain friend-backed selections until a persistent group model is intentionally introduced
- Categories remain derived filters until a stored taxonomy is intentionally introduced

## Maintenance Log
- 2026-03-13: Constitution initialized; schemas pending
- 2026-03-13: Approved Pinly MVP schemas and architectural direction
- 2026-03-13: Rebuilt the map contract around explicit stages, layer filters, time filters, city context, and place search
- 2026-03-13: Added deployment guardrails for Vercel + Neon, including migrations, safer storage config, and destructive seed protection
- 2026-03-13: Added optional Google OAuth sign-in/sign-up while preserving Prisma-backed user identity for map/friend visibility
