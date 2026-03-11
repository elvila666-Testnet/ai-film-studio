ALTER TABLE `projectContent` ADD `castingValidated` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `castingApprovedOutput` text;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `cineValidated` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `cineApprovedOutput` text;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `pdValidated` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `pdApprovedOutput` text;