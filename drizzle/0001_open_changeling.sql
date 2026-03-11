ALTER TABLE `characterLibrary` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `masterImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `moodboardImages` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `referenceImages` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `storyboardFrameHistory` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `storyboardImages` MODIFY COLUMN `imageUrl` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `storyboardImages` MODIFY COLUMN `masterImageUrl` longtext;