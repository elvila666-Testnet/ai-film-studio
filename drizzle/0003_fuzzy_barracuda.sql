ALTER TABLE `projectContent` ADD `visualStyle` text;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `scriptStatus` enum('draft','pending_review','approved') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `projectContent` ADD `technicalScriptStatus` enum('draft','pending_review','approved') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `projects` ADD `type` enum('spot','movie') DEFAULT 'movie' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `targetDuration` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `aspectRatio` varchar(50) DEFAULT '16:9';--> statement-breakpoint
ALTER TABLE `projects` ADD `thumbnailUrl` text;