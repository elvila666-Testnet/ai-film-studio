CREATE TABLE `actors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`triggerWord` varchar(255) NOT NULL,
	`loraId` varchar(255),
	`status` varchar(50) DEFAULT 'pending',
	`trainingId` varchar(255),
	`zipUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `animaticConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`frameDurations` text,
	`audioUrl` text,
	`audioVolume` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `animaticConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audioAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`type` varchar(50) NOT NULL,
	`url` text NOT NULL,
	`duration` int,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audioAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brandAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`assetType` enum('PDF','URL','IMG') NOT NULL,
	`gcsPath` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brandAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brandMusicPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
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
CREATE TABLE `brandVoiceProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
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
CREATE TABLE `brands` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`description` text,
	`targetAudience` text,
	`aesthetic` text,
	`mission` text,
	`coreMessaging` text,
	`brandVoice` text,
	`negativeConstraints` text,
	`colorPalette` json,
	`productReferenceImages` text,
	`visualIdentity` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characterLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`traits` text,
	`poses` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`referenceImageUrl` text,
	`isHero` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `editorComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clipId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`timestamp` int DEFAULT 0,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editorComments_id` PRIMARY KEY(`id`)
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
CREATE TABLE `generatedVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`videoUrl` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`provider` varchar(50) NOT NULL,
	`taskId` varchar(255),
	`modelId` varchar(255),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedVideos_id` PRIMARY KEY(`id`)
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
CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shotId` int,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text NOT NULL,
	`model` varchar(100) NOT NULL,
	`qualityTier` enum('fast','quality') NOT NULL DEFAULT 'fast',
	`cost` decimal(10,4) NOT NULL,
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`masterImageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modelConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('text','image','video') NOT NULL,
	`provider` varchar(255) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`name` varchar(255),
	`description` text,
	`costPerUnit` decimal(10,4) DEFAULT '0.0000',
	`apiKey` text,
	`apiEndpoint` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modelConfigs_id` PRIMARY KEY(`id`)
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
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moodboards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` varchar(36) NOT NULL,
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
CREATE TABLE `projectContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`brief` text,
	`synopsis` text,
	`script` text,
	`masterVisual` text,
	`technicalShots` text,
	`storyboardPrompts` text,
	`scriptComplianceScore` int,
	`visualComplianceScore` int,
	`storyboardComplianceScore` int,
	`voiceoverComplianceScore` int,
	`complianceMetadata` text,
	`globalDirectorNotes` text,
	`brandVoice` text,
	`visualIdentity` text,
	`colorPalette` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectContent_id` PRIMARY KEY(`id`)
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
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandId` varchar(36),
	`name` varchar(255) NOT NULL,
	`isScriptLocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`bible` json,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referenceImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referenceImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`locationDetails` text,
	`setDesign` text,
	`status` varchar(50) DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shotActors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shotId` int NOT NULL,
	`actorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shotActors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`order` int NOT NULL,
	`visualDescription` text,
	`audioDescription` text,
	`cameraAngle` varchar(100),
	`movement` varchar(100),
	`lighting` varchar(255),
	`lens` varchar(100),
	`filmStock` varchar(100),
	`status` varchar(50) DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardFrameHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`notes` text,
	`versionNumber` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storyboardFrameHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardFrameNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`notes` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardFrameOrder` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameOrder_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storyboardImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`videoUrl` text,
	`characterId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`characterReference` text,
	`seed` int,
	`generationVariant` int DEFAULT 0,
	`qualityTier` enum('fast','quality') NOT NULL DEFAULT 'fast',
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`masterImageUrl` text,
	`characterLibraryId` int,
	`characterAppearance` text,
	`consistencyScore` int,
	`consistencyNotes` text,
	`isConsistencyLocked` boolean DEFAULT false,
	CONSTRAINT `storyboardImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` varchar(255) NOT NULL,
	`actionType` varchar(50) NOT NULL,
	`modelId` varchar(100) NOT NULL,
	`quantity` int DEFAULT 1,
	`cost` decimal(10,4) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userModelFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modelConfigId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userModelFavorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `actors` ADD CONSTRAINT `actors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `animaticConfigs` ADD CONSTRAINT `animaticConfigs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioAssets` ADD CONSTRAINT `audioAssets_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioAssets` ADD CONSTRAINT `audioAssets_sceneId_scenes_id_fk` FOREIGN KEY (`sceneId`) REFERENCES `scenes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brandAssets` ADD CONSTRAINT `brandAssets_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brandMusicPreferences` ADD CONSTRAINT `brandMusicPreferences_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brandVoiceProfiles` ADD CONSTRAINT `brandVoiceProfiles_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brands` ADD CONSTRAINT `brands_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characterLibrary` ADD CONSTRAINT `characterLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorClips` ADD CONSTRAINT `editorClips_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_clipId_editorClips_id_fk` FOREIGN KEY (`clipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorExports` ADD CONSTRAINT `editorExports_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorProjects` ADD CONSTRAINT `editorProjects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTracks` ADD CONSTRAINT `editorTracks_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_fromClipId_editorClips_id_fk` FOREIGN KEY (`fromClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_toClipId_editorClips_id_fk` FOREIGN KEY (`toClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generatedVideos` ADD CONSTRAINT `generatedVideos_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_voiceProfileId_brandVoiceProfiles_id_fk` FOREIGN KEY (`voiceProfileId`) REFERENCES `brandVoiceProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generations` ADD CONSTRAINT `generations_shotId_shots_id_fk` FOREIGN KEY (`shotId`) REFERENCES `shots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generations` ADD CONSTRAINT `generations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moodboardImages` ADD CONSTRAINT `moodboardImages_moodboardId_moodboards_id_fk` FOREIGN KEY (`moodboardId`) REFERENCES `moodboards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moodboards` ADD CONSTRAINT `moodboards_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicLibrary` ADD CONSTRAINT `musicLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectContent` ADD CONSTRAINT `projectContent_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referenceImages` ADD CONSTRAINT `referenceImages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenes` ADD CONSTRAINT `scenes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shotActors` ADD CONSTRAINT `shotActors_shotId_shots_id_fk` FOREIGN KEY (`shotId`) REFERENCES `shots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shotActors` ADD CONSTRAINT `shotActors_actorId_actors_id_fk` FOREIGN KEY (`actorId`) REFERENCES `actors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shots` ADD CONSTRAINT `shots_sceneId_scenes_id_fk` FOREIGN KEY (`sceneId`) REFERENCES `scenes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardFrameHistory` ADD CONSTRAINT `storyboardFrameHistory_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardFrameNotes` ADD CONSTRAINT `storyboardFrameNotes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardFrameOrder` ADD CONSTRAINT `storyboardFrameOrder_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_characterId_characters_id_fk` FOREIGN KEY (`characterId`) REFERENCES `characters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_characterLibraryId_characterLibrary_id_fk` FOREIGN KEY (`characterLibraryId`) REFERENCES `characterLibrary`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_ledger` ADD CONSTRAINT `usage_ledger_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userModelFavorites` ADD CONSTRAINT `userModelFavorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userModelFavorites` ADD CONSTRAINT `userModelFavorites_modelConfigId_modelConfigs_id_fk` FOREIGN KEY (`modelConfigId`) REFERENCES `modelConfigs`(`id`) ON DELETE cascade ON UPDATE no action;