CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`collection` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`label` text DEFAULT '{}' NOT NULL,
	`published_at` integer,
	`published_version` integer,
	`published_by` text,
	`published_content` text,
	`published_schema_version` integer,
	`created_at` integer NOT NULL,
	`created_by` text,
	`updated_at` integer NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `entries_collection` ON `entries` (`collection`,`updated_at`);
