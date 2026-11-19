ALTER TABLE `submissions` ADD `updated_by` text REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
