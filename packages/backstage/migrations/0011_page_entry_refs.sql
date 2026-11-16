CREATE TABLE `page_entry_refs` (
	`page_id` text NOT NULL,
	`collection` text NOT NULL,
	`entry_id` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_entry_refs_page` ON `page_entry_refs` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_entry_refs_entry` ON `page_entry_refs` (`collection`,`entry_id`);
