CREATE TABLE `actors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`triggerWord` varchar(255) NOT NULL,
	`loraId` varchar(255),
	`status` varchar(50) DEFAULT 'pending',
	`trainingId` varchar(255),
	`zipUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audioAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`type` varchar(50) NOT NULL,
	`url` text NOT NULL,
	`duration` int,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audioAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shotActors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shotId` int NOT NULL,
	`actorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shotActors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generations` ADD `qualityTier` enum('fast','quality') DEFAULT 'fast' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenes` ADD `locationDetails` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `setDesign` text;--> statement-breakpoint
ALTER TABLE `shots` ADD `lighting` varchar(255);--> statement-breakpoint
ALTER TABLE `shots` ADD `lens` varchar(100);--> statement-breakpoint
ALTER TABLE `shots` ADD `filmStock` varchar(100);--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `qualityTier` enum('fast','quality') DEFAULT 'fast' NOT NULL;--> statement-breakpoint
ALTER TABLE `actors` ADD CONSTRAINT `actors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioAssets` ADD CONSTRAINT `audioAssets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioAssets` ADD CONSTRAINT `audioAssets_sceneId_scenes_id_fk` FOREIGN KEY (`sceneId`) REFERENCES `scenes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shotActors` ADD CONSTRAINT `shotActors_shotId_shots_id_fk` FOREIGN KEY (`shotId`) REFERENCES `shots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shotActors` ADD CONSTRAINT `shotActors_actorId_actors_id_fk` FOREIGN KEY (`actorId`) REFERENCES `actors`(`id`) ON DELETE cascade ON UPDATE no action;