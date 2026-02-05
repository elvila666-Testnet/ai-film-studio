CREATE TABLE `brandVoiceProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`elevenLabsVoiceId` varchar(255),
	`description` text,
	`language` varchar(10) DEFAULT 'en',
	`tone` varchar(100),
	`speed` int DEFAULT 100,
	`pitch` int DEFAULT 100,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandVoiceProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characterLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`traits` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generatedVoiceovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`voiceProfileId` int NOT NULL,
	`script` text NOT NULL,
	`audioUrl` text NOT NULL,
	`duration` int,
	`language` varchar(10) DEFAULT 'en',
	`elevenLabsJobId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generatedVoiceovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `moodboardImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moodboardId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`description` text,
	`colorPalette` text,
	`composition` text,
	`style` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moodboardImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `moodboards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moodboards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brandVoiceProfiles` ADD CONSTRAINT `brandVoiceProfiles_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characterLibrary` ADD CONSTRAINT `characterLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_voiceProfileId_brandVoiceProfiles_id_fk` FOREIGN KEY (`voiceProfileId`) REFERENCES `brandVoiceProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moodboardImages` ADD CONSTRAINT `moodboardImages_moodboardId_moodboards_id_fk` FOREIGN KEY (`moodboardId`) REFERENCES `moodboards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moodboards` ADD CONSTRAINT `moodboards_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;