CREATE TABLE `brandAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`assetType` enum('PDF','URL','IMG') NOT NULL,
	`gcsPath` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brandAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brandMusicPreferences` MODIFY COLUMN `brandId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `brandVoiceProfiles` MODIFY COLUMN `brandId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `brands` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `brands` MODIFY COLUMN `colorPalette` json;--> statement-breakpoint
ALTER TABLE `characterLibrary` MODIFY COLUMN `brandId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `moodboards` MODIFY COLUMN `brandId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `musicLibrary` MODIFY COLUMN `brandId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `brandId` varchar(36);--> statement-breakpoint
ALTER TABLE `brands` ADD `negativeConstraints` text;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `synopsis` text;--> statement-breakpoint
ALTER TABLE `brandAssets` ADD CONSTRAINT `brandAssets_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;