ALTER TABLE `storyboardImages` ADD `characterReference` text;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `seed` int;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD `generationVariant` int DEFAULT 0;