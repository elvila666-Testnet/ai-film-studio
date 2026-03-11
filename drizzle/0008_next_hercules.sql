ALTER TABLE `projectContent` ADD `proposalStatus` enum('draft','pending_review','approved') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `projectContent` ADD `creativeProposal` mediumtext;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `brandValidationFeedback` text;--> statement-breakpoint
ALTER TABLE `projectContent` ADD `technicalScript` mediumtext;