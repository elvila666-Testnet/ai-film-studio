CREATE TABLE `modelConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('text','image','video') NOT NULL,
	`provider` varchar(255) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`apiKey` text,
	`apiEndpoint` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modelConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generatedVideos` ADD `modelId` varchar(255);--> statement-breakpoint
ALTER TABLE `projectContent` ADD `globalDirectorNotes` text;