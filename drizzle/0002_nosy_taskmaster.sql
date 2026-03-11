ALTER TABLE `characters` MODIFY COLUMN `referenceImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `shots` ADD `aiBlueprint` json;