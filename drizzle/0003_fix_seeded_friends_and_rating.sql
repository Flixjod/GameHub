UPDATE `players` SET `is_friend` = 0 WHERE `name` IN ('ShadowFox', 'NovaQueen', 'PixelKnight', 'EchoStrike', 'ZephyrAce') AND `seeded` = 1;
--> statement-breakpoint
UPDATE `profile` SET `rating` = 1000 + (SELECT COUNT(*) FROM `matches` WHERE `status` = 'finished' AND `result` = 'win') * 25 + (SELECT COUNT(*) FROM `matches` WHERE `status` = 'finished') * 5;
