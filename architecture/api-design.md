# API Design

## Auth
- `POST /api/auth/register`
  - Creates a user with hashed password
- `GET|POST /api/auth/[...nextauth]`
  - NextAuth session endpoints
  - Runs on the Node.js runtime for Prisma compatibility on Vercel

## Friends
- `GET /api/friends/search?q=...`
  - Search usernames and return friendship/request state
- `POST /api/friends/request`
  - Send a friend request by username
- `POST /api/friends/respond`
  - Accept or decline a pending request
- `GET /api/friends/list`
  - List friends plus incoming/outgoing pending requests

## Posts
- `POST /api/uploads`
  - Upload media using the configured storage driver
  - Fails loudly when storage is misconfigured or the request exceeds the deployment-safe size limit
- `POST /api/posts`
  - Create a new place-based post
- `GET /api/posts?north=&south=&east=&west=&zoom=&layer=&time=&q=`
  - Return staged map data: `{ stage, markers, cityContext, friendActivity }`
  - Stages: `world`, `city`, `pin`, `bubble`
  - Supports `groups` and `categories` filters in addition to layer and time
  - `groups` are lightweight friend-backed selections for now
  - `categories` are derived from post media type and text cues
- `GET /api/posts/[postId]`
  - Return a single visible post
- `GET /api/posts/city?city=&country=`
  - Return visible posts plus city visitors and recent trips
- `GET /api/places/search?q=`
  - Proxy place search for create-post location selection
  - Uses an explicit timeout to avoid hanging Vercel serverless invocations

## Profiles
- `GET /api/profile/[username]`
  - Return visible profile details and posts
