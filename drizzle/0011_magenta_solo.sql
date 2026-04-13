CREATE TABLE `editorKeyframes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorClipId` int NOT NULL,
	`property` varchar(255) NOT NULL,
	`time` int NOT NULL,
	`value` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorKeyframes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('starter','pro','enterprise') NOT NULL,
	`status` enum('active','cancelled','past_due','trialing','incomplete') NOT NULL DEFAULT 'incomplete',
	`stripeCustomerId` varchar(255) NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`stripePriceId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tokenBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`totalPurchased` int NOT NULL DEFAULT 0,
	`totalConsumed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tokenBalances_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokenBalances_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tokenTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('subscription_credit','purchase','consumption','refund','bonus') NOT NULL,
	`amount` int NOT NULL,
	`balance` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`relatedProjectId` int,
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tokenTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `characterLibrary` MODIFY COLUMN `imageUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `imageUrl` text;--> statement-breakpoint
ALTER TABLE `editorTransitions` MODIFY COLUMN `duration` int NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboardImages` MODIFY COLUMN `imageUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `storyboardFrameHistory` MODIFY COLUMN `prompt` text;--> statement-breakpoint
ALTER TABLE `editorClips` ADD `effects` json;--> statement-breakpoint
ALTER TABLE `editorClips` ADD `colorCorrection` json;--> statement-breakpoint
ALTER TABLE `editorClips` ADD `textProperties` json;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD `parameters` json;--> statement-breakpoint
ALTER TABLE `productionDesignSets` ADD `directorNotes` text;--> statement-breakpoint
ALTER TABLE `productionDesignSets` ADD `isApproved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `editorKeyframes` ADD CONSTRAINT `editorKeyframes_editorClipId_editorClips_id_fk` FOREIGN KEY (`editorClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tokenBalances` ADD CONSTRAINT `tokenBalances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tokenTransactions` ADD CONSTRAINT `tokenTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tokenTransactions` ADD CONSTRAINT `tokenTransactions_relatedProjectId_projects_id_fk` FOREIGN KEY (`relatedProjectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characterLibrary` DROP COLUMN `poses`;--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `referenceImageUrl`;--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `isHero`;--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `isLocked`;