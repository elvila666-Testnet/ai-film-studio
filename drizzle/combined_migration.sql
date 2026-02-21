-- Combined migration for ai_film_studio_prod
-- Generated from drizzle migrations 0000-0013 + modelConfigs

USE ai_film_studio_prod;

-- 0000: users
CREATE TABLE IF NOT EXISTS `users` (
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

-- 0001: projectContent, projects, storyboardImages
CREATE TABLE IF NOT EXISTS `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `projectContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`brief` text,
	`script` text,
	`masterVisual` text,
	`technicalShots` text,
	`storyboardPrompts` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectContent_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `storyboardImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storyboardImages_id` PRIMARY KEY(`id`)
);

ALTER TABLE `projectContent` ADD CONSTRAINT `projectContent_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0002: generatedVideos, referenceImages
CREATE TABLE IF NOT EXISTS `generatedVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`videoUrl` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`provider` varchar(50) NOT NULL,
	`taskId` varchar(255),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedVideos_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `referenceImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referenceImages_id` PRIMARY KEY(`id`)
);

ALTER TABLE `generatedVideos` ADD CONSTRAINT `generatedVideos_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referenceImages` ADD CONSTRAINT `referenceImages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0003: editor tables
CREATE TABLE IF NOT EXISTS `editorProjects` (
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

CREATE TABLE IF NOT EXISTS `editorClips` (
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

CREATE TABLE IF NOT EXISTS `editorExports` (
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

CREATE TABLE IF NOT EXISTS `editorTracks` (
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

CREATE TABLE IF NOT EXISTS `editorTransitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorProjectId` int NOT NULL,
	`fromClipId` int NOT NULL,
	`toClipId` int NOT NULL,
	`transitionType` varchar(50) NOT NULL,
	`duration` int DEFAULT 500,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorTransitions_id` PRIMARY KEY(`id`)
);

ALTER TABLE `editorClips` ADD CONSTRAINT `editorClips_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorExports` ADD CONSTRAINT `editorExports_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorProjects` ADD CONSTRAINT `editorProjects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorTracks` ADD CONSTRAINT `editorTracks_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_editorProjectId_editorProjects_id_fk` FOREIGN KEY (`editorProjectId`) REFERENCES `editorProjects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_fromClipId_editorClips_id_fk` FOREIGN KEY (`fromClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorTransitions` ADD CONSTRAINT `editorTransitions_toClipId_editorClips_id_fk` FOREIGN KEY (`toClipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0004: editorComments
CREATE TABLE IF NOT EXISTS `editorComments` (
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

ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_clipId_editorClips_id_fk` FOREIGN KEY (`clipId`) REFERENCES `editorClips`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `editorComments` ADD CONSTRAINT `editorComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0005: animaticConfigs
CREATE TABLE IF NOT EXISTS `animaticConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`frameDurations` text,
	`audioUrl` text,
	`audioVolume` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `animaticConfigs_id` PRIMARY KEY(`id`)
);

ALTER TABLE `animaticConfigs` ADD CONSTRAINT `animaticConfigs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0006: storyboardFrameHistory, storyboardFrameNotes, storyboardFrameOrder
CREATE TABLE IF NOT EXISTS `storyboardFrameHistory` (
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

CREATE TABLE IF NOT EXISTS `storyboardFrameNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`notes` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameNotes_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `storyboardFrameOrder` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shotNumber` int NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storyboardFrameOrder_id` PRIMARY KEY(`id`)
);

ALTER TABLE `storyboardFrameHistory` ADD CONSTRAINT `storyboardFrameHistory_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `storyboardFrameNotes` ADD CONSTRAINT `storyboardFrameNotes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `storyboardFrameOrder` ADD CONSTRAINT `storyboardFrameOrder_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0007: storyboardImages extra columns
ALTER TABLE `storyboardImages` ADD `characterReference` text;
ALTER TABLE `storyboardImages` ADD `seed` int;
ALTER TABLE `storyboardImages` ADD `generationVariant` int DEFAULT 0;

-- 0008: brands, characters, projects.brandId, storyboardImages extras
CREATE TABLE IF NOT EXISTS `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`productReferenceImages` text,
	`brandVoice` text,
	`visualIdentity` text,
	`colorPalette` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`isHero` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);

ALTER TABLE `projects` ADD `brandId` int;
ALTER TABLE `storyboardImages` ADD `videoUrl` text;
ALTER TABLE `storyboardImages` ADD `characterId` int;
ALTER TABLE `brands` ADD CONSTRAINT `brands_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `characters` ADD CONSTRAINT `characters_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `projects` ADD CONSTRAINT `projects_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_characterId_characters_id_fk` FOREIGN KEY (`characterId`) REFERENCES `characters`(`id`) ON DELETE set null ON UPDATE no action;

-- 0009: brands extra columns
ALTER TABLE `brands` ADD `description` text;
ALTER TABLE `brands` ADD `targetCustomer` text;
ALTER TABLE `brands` ADD `aesthetic` text;
ALTER TABLE `brands` ADD `mission` text;
ALTER TABLE `brands` ADD `coreMessaging` text;

-- 0010: projectContent compliance columns
ALTER TABLE `projectContent` ADD `scriptComplianceScore` int;
ALTER TABLE `projectContent` ADD `visualComplianceScore` int;
ALTER TABLE `projectContent` ADD `storyboardComplianceScore` int;
ALTER TABLE `projectContent` ADD `voiceoverComplianceScore` int;
ALTER TABLE `projectContent` ADD `complianceMetadata` text;

-- 0011: brandVoiceProfiles, characterLibrary, generatedVoiceovers, moodboardImages, moodboards
CREATE TABLE IF NOT EXISTS `brandVoiceProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
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

CREATE TABLE IF NOT EXISTS `characterLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text NOT NULL,
	`traits` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterLibrary_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `generatedVoiceovers` (
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

CREATE TABLE IF NOT EXISTS `moodboardImages` (
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

CREATE TABLE IF NOT EXISTS `moodboards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moodboards_id` PRIMARY KEY(`id`)
);

ALTER TABLE `brandVoiceProfiles` ADD CONSTRAINT `brandVoiceProfiles_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `characterLibrary` ADD CONSTRAINT `characterLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `generatedVoiceovers` ADD CONSTRAINT `generatedVoiceovers_voiceProfileId_brandVoiceProfiles_id_fk` FOREIGN KEY (`voiceProfileId`) REFERENCES `brandVoiceProfiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `moodboardImages` ADD CONSTRAINT `moodboardImages_moodboardId_moodboards_id_fk` FOREIGN KEY (`moodboardId`) REFERENCES `moodboards`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `moodboards` ADD CONSTRAINT `moodboards_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0012: music tables
CREATE TABLE IF NOT EXISTS `brandMusicPreferences` (
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

CREATE TABLE IF NOT EXISTS `musicLibrary` (
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

CREATE TABLE IF NOT EXISTS `musicSuggestions` (
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

CREATE TABLE IF NOT EXISTS `projectMusicSelections` (
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

ALTER TABLE `brandMusicPreferences` ADD CONSTRAINT `brandMusicPreferences_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `musicLibrary` ADD CONSTRAINT `musicLibrary_brandId_brands_id_fk` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `musicSuggestions` ADD CONSTRAINT `musicSuggestions_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `projectMusicSelections` ADD CONSTRAINT `projectMusicSelections_musicId_musicLibrary_id_fk` FOREIGN KEY (`musicId`) REFERENCES `musicLibrary`(`id`) ON DELETE cascade ON UPDATE no action;

-- 0013: storyboardImages character consistency columns
ALTER TABLE `storyboardImages` ADD `characterLibraryId` int;
ALTER TABLE `storyboardImages` ADD `characterAppearance` text;
ALTER TABLE `storyboardImages` ADD `consistencyScore` int;
ALTER TABLE `storyboardImages` ADD `consistencyNotes` text;
ALTER TABLE `storyboardImages` ADD `isConsistencyLocked` boolean DEFAULT false;
ALTER TABLE `storyboardImages` ADD CONSTRAINT `storyboardImages_characterLibraryId_characterLibrary_id_fk` FOREIGN KEY (`characterLibraryId`) REFERENCES `characterLibrary`(`id`) ON DELETE set null ON UPDATE no action;

-- Extra: modelConfigs (not in migrations but in schema)
CREATE TABLE IF NOT EXISTS `modelConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('text','image','video') NOT NULL,
	`provider` varchar(255) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`apiKey` text,
	`apiEndpoint` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modelConfigs_id` PRIMARY KEY(`id`)
);

-- Extra: generatedVideos.modelId column (may be missing from earlier migration)
-- Safe to ignore error if column already exists
