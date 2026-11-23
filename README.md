# GameHub

Premium multiplayer gaming platform — React + Vite frontend, Express + Socket.io backend, SQLite persistence.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 (API + realtime on http://localhost:4000)
```

## Production

```bash
npm run build      # builds frontend into dist/
npm start          # serves API + built frontend on http://localhost:4000
```

## Demo accounts

Users are seeded with password `password123`: `nova`, `blitz`, `aria`, `kofi`, `rune`, …

## Accounts

- Sign up (optional email + display name), sign in, sign out; JWT sessions persist across reloads.
- **Email verification** - verify from Settings > Account & security. This environment has no SMTP server, so verification tokens are returned in the app (and written to your notifications) instead of being emailed. In production, wire `server/routes/auth.js` to an email provider.
- **Forgot password** - the login page mints a single-use token (15 min expiry) that is shown in-app; use it to set a new password.
- **Guest mode** - "Continue as guest" creates a fully functional temporary account (stats, rating, XP). Upgrade it later in Settings > Account & security to keep it forever.
- **Account deletion** - Settings > Account & security removes the user and every associated record permanently.

## Game modes

Every game offers three clearly separated modes from its lobby:

1. **Online** - ranked or casual matchmaking with animated search (elapsed time, cancel, match-found screen), private rooms, join-by-code, invites, rematch, spectators. Elo is only at stake in ranked; casual pays XP only. Server-authoritative state with per-move validation, reconnect grace period (disconnected players show "reconnecting..." and forfeit when it expires), and duplicate/turn validation.
2. **Offline Pass & Play** - two players on one device. No account or internet needed; results are saved to local offline history. (Undo is available where the mode allows it.)
3. **vs AI** - three genuinely different engines: Easy (random legal moves with corner awareness), Medium (positional evaluation with limited-depth search, C/X-square awareness), Hard (negamax + alpha-beta, move ordering, adaptive depth, exact endgame solve at <= 10 empties).

### LAN play - honest limitation

True browser-to-browser P2P would require WebRTC signaling, which needs a server component. GameHub therefore implements LAN gaming through **online rooms**: on the same local network, open GameHub from the other device at `http://<LAN-IP>:5173` (or the host machine's LAN address) and join with the room code. Pass & Play is explicitly labeled as shared-device - it never touches the network.

## Reversi

Reversi is the flagship game:

- Four board themes (Emerald Arena, Midnight Obsidian, Royal Violet, Classic Tournament) selectable in-match and persisted per game in localStorage; the same themes drive lobby previews and replay review.
- Pulsing legal-move markers, staggered synchronized 3D flip animations (with `prefers-reduced-motion` support), last-move highlight, auto pass handling, and a full endgame summary (score, duration, move count, rating for ranked, XP).
- **Match review** - every completed online match records its full move history (`matches.moves`), and step-through replay with prev/next/play-pause/speed/jump controls is available from the post-game summary and from your profile's match history. Move-quality labels (Best available / Good / Inaccuracy / Mistake) come from real depth-limited search analysis of the recorded position - not from made-up heuristics.

## Testing

```bash
node tests/engines-test.mjs   # game rules edges, flips in all directions, corners, forced/double passes, AI tiers, replay round-trip (48+ checks)
node tests/api-test.mjs       # REST + realtime: auth incl. guest/verify/reset/delete, ranked vs casual rating, spectating, forfeit, replay endpoint
npx vite build                # frontend production build
```

`tests/api-test.mjs` mutates the database - reseed and restart before fresh runs:

```bash
node server/seed.js
```

## Deployment (Koyeb / any Docker host)

The repo ships a multi-stage `Dockerfile`: stage 1 installs all deps and builds the frontend (`vite build`), stage 2 installs production dependencies only and copies `server/` + `dist/`. On boot the container seeds the SQLite database **only if it is empty** (`server/ensureSeed.js`), so restarts and redeploys never wipe player data.

### Deploy to Koyeb

1. In the [Koyeb console](https://app.koyeb.com) create a new **Web Service**, choose **GitHub** as the source and pick this repository.
2. Koyeb detects the `Dockerfile` automatically. Use these settings:
   - **Port**: `8000` (Koyeb sets the `PORT` env var; the server reads it - override by setting `PORT` manually if needed)
   - **Health check**: HTTP GET `/api/games` (instant 200, no auth required)
3. Set these environment variables:
   - `JWT_SECRET` - a long random value; sessions invalidate if it changes
4. Deploy. One container serves the API, websockets (same origin), and the built frontend - no separate database host needed.

### Persistent data

SQLite lives at `/app/data` by default. Koyeb's default filesystem is **ephemeral** - an unrelated redeploy resets accounts, match history, and ratings. To persist it, attach a Koyeb **Volume** and point the app at it via `DATA_DIR` (e.g. `/var/lib/koyeb/volumes/gamehub/data`). Migrations are schema-safe: tables are created on boot if missing.
