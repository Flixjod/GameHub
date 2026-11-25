# GameHub

Premium multiplayer gaming platform — play, enjoy, with friends.

GameHub is a dark, emerald-accented gaming platform with a dashboard,
game library, live rooms, tournaments, leaderboards, friends, a store,
and settings. Every statistic, achievement, and leaderboard position is
earned from matches actually played and persisted in the database —
there are no hardcoded dummy statistics for the signed-in player.

## Games

All six games are fully playable, with server-validated moves, turn
and version checks (duplicate moves are rejected), timers, win / loss /
draw detection, result screens, and match history:

| Game | Tagline | Category |
| --- | --- | --- |
| **Reversi** | Flip. Conquer. Win. | Strategy |
| **Ludo** | Roll. Move. Win. | Board |
| **Snake & Ladder** | Climb. Don't Fall. | Casual |
| **TicTacToe** | Think. Win. | Strategy |
| **Connect Four** | Drop. Align. Win. | Strategy |
| **RPS Blitz** | Read. React. Win. | Casual |

Game rules live in `server/src/games.ts`. The client never decides a
result on its own: moves are sent to server actions, validated there,
and only the server's returned state is rendered.

## Match modes and the waiting room

Every game can be played in three modes, chosen from the play dialog on
each game card in the library:

- **VS AI** — start instantly against a platform rival. Three AI
  difficulty levels (Easy / Normal / Hard) change how sharp the
  opponent plays and scale the rewards: Easy ×0.8, Normal ×1.0,
  Hard ×1.3. On Hard, TicTacToe plays unbeatable minimax, Reversi uses
  positional weights, Ludo chases captures and finishes, and Connect
  Four runs a shallow minimax that refuses to open a winning square.
- **Waiting room (online)** — a matchmaking lobby. Entering the
  waiting room queues you for the chosen game (new `lobby` table,
  migration `0004`). The server pairs two queued humans when present;
  otherwise, after a short randomized 2.5–5.5 s wait, an online rival
  sits down and the match starts. The client polls the seat with the
  `joinQueue` / `pollQueue` / `leaveQueue` actions. Matches created
  this way use match mode `online`.
- **Live rooms** — create or join a room and play against its host,
  unchanged (match mode `room`).

True peer-to-peer (client-to-client) play is not possible in this
runtime: there are no sockets and the runtime is request/response only
(see Limitations). The waiting room plus persisted server state is the
platform-correct equivalent — queued human pairs are matched as soon as
both seats are filled.

## Features

- **Dashboard** — sidebar navigation, cinematic hero, player stats
  (level, XP progress, wins, games played, rating), Popular Games,
  Live Rooms, a last-7-days gaming activity chart, achievements, and
  Friends Online.
- **Games** — complete library with search, category filtering, sorting
  (A–Z / most played / open seats), descriptions, and a play dialog
  per game — VS AI with difficulty, the waiting room, and that game's
  open rooms — for all six games.
- **Waiting room** — matchmaking queue with a live seat view (seat
  occupancy, elapsed search time, cancel). Pairs queued humans
  immediately; otherwise an online rival joins after a short wait.
  See “Match modes and the waiting room” above.
- **Rooms** — create, join, and leave rooms with availability and
  capacity validation. Room and match state is persisted server-side;
  the client polls the active match/room (every ~2.5 s while a game
  screen is open) because this runtime has no WebSocket channel.
- **Tournaments** — upcoming, live, and completed tournaments with
  registration / unregistration, entry fees, slots, prizes, and winners.
- **Leaderboard** — global rankings ordered by rating, with player
  statistics. See “Rating” below for the shared formula.
- **Friends** — friends list with online / in-game / offline status,
  incoming and outgoing friend requests (accept / reject), player
  search, room invitations, and friend removal. See “Friends” below.
- **Store** — premium membership, avatar frames, themes, cosmetics,
  and rewards, bought with coins earned in-game, with purchase history
  and equip support for owned frames / themes.
- **Settings** — display name and bio, privacy toggles (public profile,
  online status, friend requests), notification preferences, sound /
  music toggles, accent theme, and a two-factor toggle.
- **Notifications, search, and achievements** — in-app notifications,
  search across games and players, and achievements derived from real
  match, friend, room, tournament, and store activity.

## Rating and friends

These behaviours are intentional — do not “fix” them back:

- **Rating:** dashboard and leaderboard share one computed rating:
  `1000 + wins × 25 + games × 5`, counted from finished matches.
  A fresh profile rates **1,000**. The stored `profile.rating` column
  is kept in sync when a match finishes.
- **Friends:** a fresh profile has **0 friends**. The seeded rival
  players (ShadowFox, NovaQueen, PixelKnight, EchoStrike, ZephyrAce)
  are catalogue / leaderboard players only (`is_friend = 0`); they
  become friends only through the friend-request flow. The
  “Social Player — Add 3 friends” achievement therefore starts at
  **0/3**.

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime | Hatch TypeScript space (`space.json`: `"runtime": "typescript"`) |
| Package manager / runtime | Bun 1.3.10 (`package.json`: `"packageManager": "bun@1.3.10"`) |
| Package | `hatch-ts-space-gamehub` (`"private": true`) |
| SDK | `@hatch/space-sdk` via a `file:` dependency (see below) |
| Frontend | React 19, React DOM 19, TanStack React Query, Recharts, Tailwind CSS 4 |
| Backend | Typed server actions (`server/src/actions.ts`) via `@hatch/space-sdk` |
| Game logic | `server/src/games.ts` — server-validated moves for all six games |
| Database | Drizzle ORM with a per-artifact SQLite database (`app.db`) |
| Validation | Zod request/response schemas on every action |
| Language | TypeScript (strict) for both client and server |

Project layout:

```text
client/
  index.html            # space entry HTML (entry point: client/dist/index.html)
  build.mjs             # client bundling via @hatch/space-sdk/build
  src/
    App.tsx             # dashboard shell, navigation, search, notifications
    Play.tsx            # in-match game screens
    pages.tsx           # Games, Rooms, Tournaments, Leaderboard, Friends, Store, Settings, …
    ui.tsx              # shared UI primitives and game metadata
    api.ts              # typed action client (types imported from server/src/actions.ts)
    theme.css           # design tokens and component styles
    assets/             # owned game / hero / avatar artwork (WebP)
server/
  src/
    actions.ts          # all server actions (dashboard, rooms, matches, lobby, friends, …)
    games.ts            # game rules, AI difficulties and server-side move validation
    schema.ts           # Drizzle schema for all tables
drizzle/                # SQL migrations — see “Database and migrations”
space.json              # Hatch space metadata (name, slug, runtime, entry)
package.json
bunfig.toml
tsconfig.base.json
```

## How it runs — read this first

**GameHub is a Hatch TypeScript-space app. It is not a standalone app
as-is, and this repository does not contain a standalone HTTP server
entry point.**

Specifically:

- There is no `server.listen(...)`, Express / Hono / `Bun.serve` entry
  point, or other standalone server file to run. Server behaviour is
  exposed as typed actions in `server/src/actions.ts`, which the Hatch
  space runtime hosts and dispatches.
- `space.json` declares the runtime and entry point:

  ```json
  {
    "runtime": "typescript",
    "name": "GameHub",
    "slug": "gamehub",
    "entry": "client/dist/index.html"
  }
  ```

- `@hatch/space-sdk` is **not** an npm-published dependency here. In
  `package.json` it is a local file dependency:

  ```json
  "@hatch/space-sdk": "file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz"
  ```

  That path exists inside the Hatch runtime environment. On a plain
  machine without Hatch, `bun install` cannot resolve it, and the
  client build helper (`@hatch/space-sdk/build`, used by
  `client/build.mjs`) and the action runtime (`defineAction`, `ctx.db`,
  `ctx.invalidateQueries()`, …) are unavailable.
- The database is a per-artifact SQLite file (`app.db`) managed by the
  Hatch runtime through Drizzle; it is runtime data, not source, and
  is excluded from this repository (see “What is not in this repo”).

To turn this into a standalone app you would need to provide your own
host for the actions (an HTTP server that dispatches them), replace
the `file:` SDK dependency with a published or vendored equivalent,
and provision the SQLite database yourself. That work has not been
done here — this repo is the Hatch space source, published for
inspection, version control, and continued development inside Hatch.

### Running it in the Hatch space runtime

Prerequisites: the Hatch TypeScript-space runtime, with Bun 1.3.10 and
the `@hatch/space-sdk` tarball present at the `file:` path above.

1. Place this source in a Hatch TypeScript space (slug `gamehub`).
2. Install dependencies:

   ```sh
   bun install
   ```

3. Type-check (optional, mirrors the package script):

   ```sh
   bun run typecheck
   # bun x tsc --noEmit -p client/tsconfig.json && bun x tsc --noEmit -p server/tsconfig.json
   ```

4. Build through the package scripts — or, preferably, through the
   Hatch space build tooling, which builds, registers, and serves the
   artifact:

   ```sh
   bun run build
   # build:server — bun build ./src/actions.ts --target=bun --outfile=./dist/actions.js  (in server/)
   # build:client — bun ./client/build.mjs
   ```

5. Open the artifact through the Hatch / Muse client. The runtime
   applies the Drizzle migrations to the space's `app.db`, serves
   `client/dist/index.html`, and routes client action calls to the
   built server actions. State is created lazily on first load (one
   profile row) and then grows only from use: matches, rooms,
   purchases, notifications, friend requests, and tournament entries.

There is no separate dev-server command, port, or `.env` configuration
in this source; hosting, routing, and the database file are owned by
the Hatch runtime.

## Database and migrations

Schema: `server/src/schema.ts` (Drizzle, SQLite). Tables: `profile`,
`players`, `friend_requests`, `rooms`, `matches`, `lobby`, `tournaments`,
`store_items`, `purchases`, `notifications`, `settings` (plus the
scaffold's original `entries` table from the first migration).

Migrations in `drizzle/`, applied in order — **preserve this sequence
intact**:

| File | Contents |
| --- | --- |
| `0001_initial.sql` | Starter scaffold table (`entries`). |
| `0002_gamehub_core_tables.sql` | All GameHub core tables (`profile`, `players`, `friend_requests`, `rooms`, `matches`, `tournaments`, `store_items`, `purchases`, `notifications`, `settings`). |
| `0003_fix_seeded_friends_and_rating.sql` | Correction: sets the five seeded rivals to `is_friend = 0` and recomputes the stored profile rating as `1000 + wins × 25 + games × 5` from finished matches. |
| `0004_lobby_and_indexes.sql` | Adds the `lobby` waiting-room table plus indexes on `matches.status`, `rooms.status`, and `lobby(game_id, status)`. |

> **Note on the `4.8` in `0002`:** `0002_gamehub_core_tables.sql`
> historically declared `profile.rating` as `REAL NOT NULL DEFAULT 4.8`.
> That is a record of how the table was first created — **do not edit
> `0002` to change it.** The fix lives in the current schema and in
> `0003`: `server/src/schema.ts` now declares the column as
> `integer("rating").notNull().default(1000)`, and
> `0003_fix_seeded_friends_and_rating.sql` corrects rows that were
> already seeded under the old default. Editing an already-applied
> migration would not fix existing databases and would break the
> migration history.

## What is not in this repo

Excluded via `.gitignore` — runtime data and build output, never source:

- `app.db`, `app.db-shm`, `app.db-wal` (and any `app.db*`) — the live
  per-artifact SQLite database and its WAL sidecar files. It contains
  the player's profile, matches, and progress; recreating the space
  creates a fresh one.
- `node_modules/` — install with `bun install` inside the Hatch runtime.
- `client/dist/`, `client/dist-cvm/` — built client bundles.
- `server/dist/` — built server actions bundle.
- `.space-build/`, `.space-build-cvm/` — Hatch build staging output.
- `audits/` — build-audit captures and screenshots.
- Built JS/CSS bundles generally (`*.min.js`, `*.min.css`, bundle and
  chunk files under build output directories).

Source artwork under `client/src/assets/` **is** included; only built
output is excluded.

## Design

Premium dark gaming interface: almost-black background (`#050807`),
deep green-black surfaces, neon emerald accent (`#2ee89a`), with cyan,
purple, and gold as secondary accents. Typography is Outfit for display
text. The layout is phone-first in the Hatch webview (bottom navigation
on small screens) and expands to the fixed-sidebar, multi-column
dashboard on larger screens.

## Limitations

- **No WebSockets.** The Hatch action runtime is request/response
  only, so “live” rooms and matches sync by persisted server state plus
  client polling, not sockets. Room matches play against the room's
  host / an AI opponent so every game is completable.
- **Single-player profile.** There is no standalone auth system in this
  source; the Hatch runtime owns the surrounding session, and the app
  keeps one local player profile (`ProGamer` by default, renameable in
  Settings).
- **Catalogue content is platform data.** The game library, rival
  player catalogue, tournament catalogue, and store catalogue are
  seeded platform content. The signed-in player's own stats, activity,
  achievements, coins, and rating are never seeded — they are derived
  only from matches the player actually plays.
