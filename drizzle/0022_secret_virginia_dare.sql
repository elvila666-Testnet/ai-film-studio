ALTER TABLE `generations` ADD `status` enum('draft','approved') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` ADD `masterImageUrl` text;