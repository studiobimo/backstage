ALTER TABLE `entries` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `entries` SET `position` = (SELECT count(*) FROM `entries` AS `earlier` WHERE `earlier`.`collection` = `entries`.`collection` AND (`earlier`.`created_at` < `entries`.`created_at` OR (`earlier`.`created_at` = `entries`.`created_at` AND `earlier`.`id` < `entries`.`id`)));--> statement-breakpoint
CREATE INDEX `entries_collection_position` ON `entries` (`collection`,`position`);
