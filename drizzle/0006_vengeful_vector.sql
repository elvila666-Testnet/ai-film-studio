CREATE TABLE `productionDesignProps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setId` int,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`symbolism` text,
	`imageGenerationPrompt` text,
	`imageUrl` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productionDesignProps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productionDesignSets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` mediumtext,
	`atmospherePhilosophy` mediumtext,
	`imageGenerationPrompt` mediumtext,
	`imageUrl` longtext,
	`referenceImageUrl` longtext,
	`status` varchar(50) DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productionDesignSets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shots` ADD `referenceImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `projectContent` ADD CONSTRAINT `projectContent_projectId_unique` UNIQUE(`projectId`);--> statement-breakpoint
ALTER TABLE `productionDesignProps` ADD CONSTRAINT `productionDesignProps_setId_productionDesignSets_id_fk` FOREIGN KEY (`setId`) REFERENCES `productionDesignSets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productionDesignProps` ADD CONSTRAINT `productionDesignProps_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productionDesignSets` ADD CONSTRAINT `productionDesignSets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;