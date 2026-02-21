CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shotId` int,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text NOT NULL,
	`model` varchar(100) NOT NULL,
	`cost` decimal(10,4) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`status` varchar(50) DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`order` int NOT NULL,
	`visualDescription` text,
	`audioDescription` text,
	`cameraAngle` varchar(100),
	`movement` varchar(100),
	`status` varchar(50) DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` varchar(255) NOT NULL,
	`actionType` varchar(50) NOT NULL,
	`modelId` varchar(100) NOT NULL,
	`quantity` int DEFAULT 1,
	`cost` decimal(10,4) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `bible` json;--> statement-breakpoint
ALTER TABLE `generations` ADD CONSTRAINT `generations_shotId_shots_id_fk` FOREIGN KEY (`shotId`) REFERENCES `shots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generations` ADD CONSTRAINT `generations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenes` ADD CONSTRAINT `scenes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shots` ADD CONSTRAINT `shots_sceneId_scenes_id_fk` FOREIGN KEY (`sceneId`) REFERENCES `scenes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_ledger` ADD CONSTRAINT `usage_ledger_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;