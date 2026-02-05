CREATE TABLE `brandMusicPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`preferredGenres` text,
	`preferredMoods` text,
	`tempoRange` varchar(50),
	`excludedGenres` text,
	`excludedArtists` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandMusicPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255),
	`description` text,
	`audioUrl` text NOT NULL,
	`duration` int,
	`genre` varchar(100),
	`mood` varchar(100),
	`tempo` int,
	`isActive` boolean DEFAULT true,
	`source` varchar(50),
	`sourceId` varchar(255),
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`musicId` int NOT NULL,
	`matchScore` int,
	`reasoning` text,
	`moodAlignment` int,
	`brandAlignment` int,
	`paceAlignment` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `musicSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMusicSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`musicId` int NOT NULL,
	`startTime` int,
	`duration` int,
	`volume` int DEFAULT 100,
	`fadeIn` int DEFAULT 0,
	`fadeOut` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMusicSelections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brandMusicPreferences` ADD CONSTRAINT `brandMusicPreferences_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicLibrary` ADD CONSTRAINT `musicLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;