-- Waiting-room lobby for matchmaking plus hot-path indexes.
CREATE TABLE `lobby` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_id` text NOT NULL,
  `player_name` text NOT NULL DEFAULT 'ProGamer',
  `difficulty` text NOT NULL DEFAULT 'normal',
  `status` text NOT NULL DEFAULT 'waiting',
  `opponent` text,
  `match_id` integer,
  `created_at` integer NOT NULL,
  `matched_at` integer
);
--> statement-breakpoint
CREATE INDEX `matches_status_idx` ON `matches` (`status`);
--> statement-breakpoint
CREATE INDEX `rooms_status_idx` ON `rooms` (`status`);
--> statement-breakpoint
CREATE INDEX `lobby_game_status_idx` ON `lobby` (`game_id`, `status`);
