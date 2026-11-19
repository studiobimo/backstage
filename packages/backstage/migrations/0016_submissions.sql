CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`form` text NOT NULL,
	`token_hash` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_token_hash_unique` ON `submissions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `submissions_form_status` ON `submissions` (`form`,`status`,`created_at`);
