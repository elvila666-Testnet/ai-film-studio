ALTER TABLE `storyboardImages` ADD `characterLibraryId` int;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `characterAppearance` text;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `consistencyScore` int;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `consistencyNotes` text;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `isConsistencyLocked` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_characterLibraryId_characterLibrary_id_fk` FOREIGN KEY (`characterLibraryId`) REFERENCES `characterLibrary`(`id`) ON DELETE set null ON UPDATE no action;