CREATE TABLE `storyboardFrameHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`notes` text,
	`versionNumber` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storyboardFrameHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardFrameNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`notes` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardFrameOrder` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameOrder_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `storyboardFrameHistory` ADD CONSTRAINT `storyboardFrameHistory_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardFrameNotes` ADD CONSTRAINT `storyboardFrameNotes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardFrameOrder` ADD CONSTRAINT `storyboardFrameOrder_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;