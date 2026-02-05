CREATE TABLE `generatedVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`videoUrl` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`provider` varchar(50) NOT NULL,
	`taskId` varchar(255),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedVideos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referenceImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referenceImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generatedVideos` ADD CONSTRAINT `generatedVideos_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referenceImages` ADD CONSTRAINT `referenceImages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;