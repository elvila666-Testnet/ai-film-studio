CREATE TABLE `editorComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clipId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`timestamp` int DEFAULT 0,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editorComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_clipId_editorClips_id_fk` FOREIGN KEY (`clipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;