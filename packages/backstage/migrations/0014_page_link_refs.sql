CREATE TABLE `page_link_refs` (
	`page_id` text,
	`target_page_id` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_link_refs_page` ON `page_link_refs` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_link_refs_target` ON `page_link_refs` (`target_page_id`);
