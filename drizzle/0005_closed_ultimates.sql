CREATE TABLE `animaticConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`frameDurations` text,
	`audioUrl` text,
	`audioVolume` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `animaticConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `animaticConfigs` ADD CONSTRAINT `animaticConfigs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;