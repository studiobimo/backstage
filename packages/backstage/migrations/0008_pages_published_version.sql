ALTER TABLE `pages` ADD `published_version` integer;--> statement-breakpoint
UPDATE `pages` SET `published_version` = `version` WHERE `published_at` IS NOT NULL;
