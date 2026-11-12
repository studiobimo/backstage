CREATE TABLE `site_publication` (
	`id` text PRIMARY KEY NOT NULL,
	`published_at` integer NOT NULL,
	`published_by` text,
	`versions` text NOT NULL,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
