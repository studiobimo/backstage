CREATE TABLE `entry_locales` (
	`entry_id` text NOT NULL,
	`collection` text NOT NULL,
	`locale` text NOT NULL,
	`slug` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_locales_pk` ON `entry_locales` (`entry_id`,`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `entry_locales_slug` ON `entry_locales` (`collection`,`locale`,`slug`);
