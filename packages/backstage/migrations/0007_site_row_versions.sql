ALTER TABLE `site_blocks` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_blocks` ADD `updated_by` text REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `updated_by` text REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
