ALTER TABLE `projectContent` MODIFY COLUMN `visualStyle` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `visualDescription` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `audioDescription` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `movement` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `lighting` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `lens` longtext;--> statement-breakpoint
ALTER TABLE `shots` MODIFY COLUMN `aiBlueprint` longtext;--> statement-breakpoint
ALTER TABLE `storyboardFrameHistory` MODIFY COLUMN `prompt` longtext;--> statement-breakpoint
ALTER TABLE `storyboardImages` MODIFY COLUMN `prompt` longtext;--> statement-breakpoint
ALTER TABLE `storyboardImages` MODIFY COLUMN `characterAppearance` json;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `proposalDirectorNotes` mediumtext;--> statement-breakpoint
ALTER TABLE `shots` ADD `directorNotes` text;--> statement-breakpoint
ALTER TABLE `shots` ADD `isApproved` boolean DEFAULT false NOT NULL;