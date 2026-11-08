CREATE TABLE `site_blocks` (
	`slot` text PRIMARY KEY NOT NULL,
	`block` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
