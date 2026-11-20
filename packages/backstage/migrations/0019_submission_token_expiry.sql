ALTER TABLE `submissions` ADD `token_expires_at` integer;--> statement-breakpoint
UPDATE `submissions` SET `token_expires_at` = `created_at` + 2592000000;
