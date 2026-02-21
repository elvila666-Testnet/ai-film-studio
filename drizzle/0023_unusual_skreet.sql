ALTER TABLE `storyboardImages` ADD `status` enum('draft','approved') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `masterImageUrl` text;