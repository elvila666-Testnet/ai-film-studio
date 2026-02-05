CREATE TABLE `editorClips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorProjectId` int NOT NULL,
	`trackId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`duration` int NOT NULL,
	`startTime` int DEFAULT 0,
	`endTime` int,
	`trimStart` int DEFAULT 0,
	`trimEnd` int,
	`volume` int DEFAULT 100,
	`order` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorClips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorExports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorProjectId` int NOT NULL,
	`exportUrl` text,
	`format` varchar(50) NOT NULL,
	`quality` varchar(50) DEFAULT '1080p',
	`status` varchar(50) DEFAULT 'pending',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editorExports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`duration` int DEFAULT 0,
	`fps` int DEFAULT 24,
	`resolution` varchar(50) DEFAULT '1920x1080',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editorProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorProjectId` int NOT NULL,
	`trackType` varchar(50) NOT NULL,
	`trackNumber` int NOT NULL,
	`name` varchar(255),
	`muted` boolean NOT NULL DEFAULT false,
	`volume` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorTracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorTransitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorProjectId` int NOT NULL,
	`fromClipId` int NOT NULL,
	`toClipId` int NOT NULL,
	`transitionType` varchar(50) NOT NULL,
	`duration` int DEFAULT 500,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorTransitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `editorClips` ADD CONSTRAINT `editorClips_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorExports` ADD CONSTRAINT `editorExports_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorProjects` ADD CONSTRAINT `editorProjects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTracks` ADD CONSTRAINT `editorTracks_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_fromClipId_editorClips_id_fk` FOREIGN KEY (`fromClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_toClipId_editorClips_id_fk` FOREIGN KEY (`toClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;