CREATE TABLE `userModelFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modelConfigId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userModelFavorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `characterLibrary` ADD `poses` text;--> statement-breakpoint
ALTER TABLE `modelConfigs` ADD `name` varchar(255);--> statement-breakpoint
ALTER TABLE `modelConfigs` ADD `description` text;--> statement-breakpoint
ALTER TABLE `modelConfigs` ADD `costPerUnit` decimal(10,4) DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE `userModelFavorites` ADD CONSTRAINT `userModelFavorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userModelFavorites` ADD CONSTRAINT `userModelFavorites_modelConfigId_modelConfigs_id_fk` FOREIGN KEY (`modelConfigId`) REFERENCES `modelConfigs`(`id`) ON DELETE cascade ON UPDATE no action;