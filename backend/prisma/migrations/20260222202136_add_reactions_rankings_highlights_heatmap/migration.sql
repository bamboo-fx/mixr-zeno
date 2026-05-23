-- CreateTable
CREATE TABLE "StoryReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "reactorId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryReaction_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryReaction_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "MixerStory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryReaction_reactorId_fkey" FOREIGN KEY ("reactorId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyMixerRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "mixerId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "breakdown" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyMixerRanking_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyMixerRanking_mixerId_fkey" FOREIGN KEY ("mixerId") REFERENCES "Mixer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverStoryItemId" TEXT,
    "createdById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupHighlight_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupHighlight_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupHighlight_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupHighlight_coverStoryItemId_fkey" FOREIGN KEY ("coverStoryItemId") REFERENCES "MixerStory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupHighlightItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "highlightId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sourceStoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupHighlightItem_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "GroupHighlight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupHighlightItem_sourceStoryId_fkey" FOREIGN KEY ("sourceStoryId") REFERENCES "MixerStory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampusVenue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampusVenue_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VenueVibe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "timeBucket" DATETIME NOT NULL,
    "vibeScore" REAL NOT NULL DEFAULT 1.0,
    "uniqueContributors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VenueVibe_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VenueVibe_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "CampusVenue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VibeContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "timeBucket" DATETIME NOT NULL,
    "contributorHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VibeContribution_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VibeContribution_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "CampusVenue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StoryReaction_storyId_createdAt_idx" ON "StoryReaction"("storyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StoryReaction_collegeId_createdAt_idx" ON "StoryReaction"("collegeId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StoryReaction_storyId_reactorId_reaction_key" ON "StoryReaction"("storyId", "reactorId", "reaction");

-- CreateIndex
CREATE INDEX "WeeklyMixerRanking_collegeId_weekStart_rank_idx" ON "WeeklyMixerRanking"("collegeId", "weekStart", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyMixerRanking_collegeId_weekStart_mixerId_key" ON "WeeklyMixerRanking"("collegeId", "weekStart", "mixerId");

-- CreateIndex
CREATE INDEX "GroupHighlight_groupId_createdAt_idx" ON "GroupHighlight"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GroupHighlight_collegeId_idx" ON "GroupHighlight"("collegeId");

-- CreateIndex
CREATE INDEX "GroupHighlightItem_highlightId_createdAt_idx" ON "GroupHighlightItem"("highlightId", "createdAt");

-- CreateIndex
CREATE INDEX "CampusVenue_collegeId_idx" ON "CampusVenue"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "CampusVenue_collegeId_name_key" ON "CampusVenue"("collegeId", "name");

-- CreateIndex
CREATE INDEX "VenueVibe_collegeId_timeBucket_idx" ON "VenueVibe"("collegeId", "timeBucket");

-- CreateIndex
CREATE UNIQUE INDEX "VenueVibe_collegeId_venueId_timeBucket_key" ON "VenueVibe"("collegeId", "venueId", "timeBucket");

-- CreateIndex
CREATE INDEX "VibeContribution_venueId_timeBucket_idx" ON "VibeContribution"("venueId", "timeBucket");

-- CreateIndex
CREATE UNIQUE INDEX "VibeContribution_contributorHash_key" ON "VibeContribution"("contributorHash");
