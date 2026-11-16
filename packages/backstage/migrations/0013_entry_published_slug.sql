ALTER TABLE `entry_locales` ADD `published_slug` text;
--> statement-breakpoint
UPDATE `entry_locales` SET `published_slug` = `slug` WHERE `entry_id` IN (SELECT `id` FROM `entries` WHERE `published_at` IS NOT NULL);
