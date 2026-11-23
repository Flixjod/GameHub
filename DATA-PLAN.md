# Data Plan

## Context provenance
- `Play. Enjoy. With Friends.` + full GameHub brief (verbatim user request; defines all pages, four games, dark emerald design, sidebar/hero/stats/live-rooms layout)
- Reference screenshot at `workspace/user/media_library/image/D90751C8-E0F3-4278-B82A-519B34F8B410.png` (user-supplied; primary visual direction — almost-black #050807, neon emerald, sidebar + hero + stats + popular games + live rooms + activity + achievements + friends-online composition). Copied into `client/src/assets/reference-hero.png` only as design reference during build; the shipped hero/game art is generated owned artwork, not the screenshot itself.
- `Avoid hardcoded dummy statistics, fake online users, and simulated multiplayer functionality in production.` (user requirement; shaped the data model: user stats/activity/achievements are derived only from matches the user actually plays and persists via server actions; platform catalog data — game library, rival players, tournaments, store items — is labeled platform content, and rooms/matches are real DB rows with server-validated moves. No WebSocket infra exists in this runtime, so live sync is DB polling via actions, disclosed in UI copy as live rooms.)

## Tested sources
No external HTTP APIs are used. All data is first-party: server actions + per-artifact SQLite (drizzle). Starter scaffold inspected directly:
### Artifact scaffold
**Used by**: all actions
**Test command**: `read server/src/actions.ts, server/src/schema.ts, client/src/App.tsx, drizzle/0001_initial.sql`
**Sample output**: scaffold exposes `defineAction` + `ctx.db<typeof schema>()`, `ctx.invalidateQueries()`, entries table only — no auth, no websockets, no existing game logic to preserve.
**Processing**: Replace entries schema with GameHub tables via a new migration; keep the typed action-client pattern (`client/src/api.ts`).

## Imagery
Generated owned artwork via `media.generate_image` into `client/src/assets/` (build-time, imported by client):
- `hero.png` — cinematic gaming composition (controller, dice, chess pawn, floating game tiles, emerald glow) for the hero banner right side.
- `game-reversi.png`, `game-ludo.png`, `game-snakes.png`, `game-tictactoe.png` — one cover per playable game, used on dashboard cards, Games library, and room rows.
- `avatar.png` — player avatar portrait for ProGamer profile/stats/sidebar.
Each result is opened with `muse.read` and rejected if it has baked-in text, watermarks, or contradicts the dark emerald art direction. No remote/CDN image URLs are rendered.

## Long-term data behavior
- **Refresh policy**: No scheduled refresh. All state is user-generated at runtime; client refetches via react-query invalidation after every mutation and polls the active match/room every 2.5s while a game screen is open.
- **Growth**: One profile row (created lazily on first load), plus append-only matches, activity days, purchases, notifications; rooms are created/joined/left by the user; friends/requests/tournament entries are user-managed rows.
- **Ordering**: Matches and notifications newest-first; leaderboard by rating desc; rooms open-first then newest; activity chronological.
- **Time semantics**: Match/notification timestamps are creation instants rendered viewer-local; activity is bucketed by viewer-local calendar day; tournament dates are fixed catalog dates shown as dates, not live claims.

## Correction (2026-11-23)
- Seeded rivals (ShadowFox, NovaQueen, PixelKnight, EchoStrike, ZephyrAce) are catalogue players only: `is_friend = 0` at seed; friendship is earned exclusively via the friend-request flow. Fresh state is 0 friends, so "Social Player — Add 3 friends" starts at 0/3.
- The static 4.8 profile rating is removed (schema default and seed now 1,000). Dashboard and leaderboard share one computed rating: `1,000 + wins×25 + games×5` from finished matches (fresh: 1,000). `getDashboard` computes it live and heals the stored column; `makeMove` keeps the stored column in sync on match finish.
- Migration `0003_fix_seeded_friends_and_rating.sql` corrects already-seeded live rows: unfriends the five seeded rivals and recomputes the stored profile rating from finished matches.

## Rejected approaches
- **Tried**: Real WebSocket multiplayer
  **Why rejected**: The artifact runtime exposes only typed server actions (request/response) — no socket server. Sync is implemented as server-persisted match state + client polling with server-side move validation, duplicate-move rejection (turn + version check), and AI opponents so every game is completable solo.
- **Tried**: Seeding the reference's Level 12 / 24 wins / 48 games as the user's stats
  **Why rejected**: User explicitly forbade hardcoded dummy statistics. The profile starts fresh (Level 1, 0 games) and every stat, activity point, achievement, coin, and leaderboard rating is earned through played matches recorded in the DB.
