-- CreateTable
CREATE TABLE "MixerGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mixerId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MixerGroup_mixerId_fkey" FOREIGN KEY ("mixerId") REFERENCES "Mixer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MixerRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mixerId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedGroupId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MixerRating_mixerId_fkey" FOREIGN KEY ("mixerId") REFERENCES "Mixer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerRating_ratedGroupId_fkey" FOREIGN KEY ("ratedGroupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MixerMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mixerId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MixerMedia_mixerId_fkey" FOREIGN KEY ("mixerId") REFERENCES "Mixer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "supplies" TEXT,
    "minPeople" INTEGER NOT NULL DEFAULT 4,
    "maxPeople" INTEGER NOT NULL DEFAULT 50,
    "energyLevel" INTEGER NOT NULL DEFAULT 3,
    "alcoholRelated" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AISuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mixerId" TEXT,
    "groupIds" TEXT NOT NULL,
    "totalPeople" INTEGER NOT NULL,
    "energyPref" INTEGER NOT NULL DEFAULT 3,
    "alcoholAllowed" BOOLEAN NOT NULL DEFAULT true,
    "suggestedActivities" TEXT NOT NULL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "avgStarRating" REAL,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("category", "collegeId", "coverImageUrl", "createdAt", "createdById", "description", "id", "isVerified", "name") SELECT "category", "collegeId", "coverImageUrl", "createdAt", "createdById", "description", "id", "isVerified", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE TABLE "new_Mixer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "groupAId" TEXT NOT NULL,
    "groupBId" TEXT NOT NULL,
    "scheduledStart" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "activityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "pairingMode" TEXT NOT NULL DEFAULT 'manual',
    "pairingLocked" BOOLEAN NOT NULL DEFAULT false,
    "liveStartedAt" DATETIME,
    "completedAt" DATETIME,
    "recapExpiresAt" DATETIME,
    "avgRating" REAL,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mixer_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mixer_groupAId_fkey" FOREIGN KEY ("groupAId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mixer_groupBId_fkey" FOREIGN KEY ("groupBId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mixer_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Mixer" ("activityId", "collegeId", "completedAt", "createdAt", "groupAId", "groupBId", "id", "liveStartedAt", "location", "pairingLocked", "pairingMode", "scheduledStart", "status") SELECT "activityId", "collegeId", "completedAt", "createdAt", "groupAId", "groupBId", "id", "liveStartedAt", "location", "pairingLocked", "pairingMode", "scheduledStart", "status" FROM "Mixer";
DROP TABLE "Mixer";
ALTER TABLE "new_Mixer" RENAME TO "Mixer";
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "collegeId" TEXT,
    "yearInSchool" TEXT,
    "drinkingPreference" TEXT NOT NULL DEFAULT 'flexible',
    "relationshipStatus" TEXT NOT NULL DEFAULT 'single',
    "personalityIndex" REAL NOT NULL DEFAULT 0.5,
    "reliabilityScore" REAL NOT NULL DEFAULT 0.5,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("age", "avatarUrl", "bio", "collegeId", "createdAt", "drinkingPreference", "email", "gender", "id", "name", "personalityIndex", "reliabilityScore", "role", "updatedAt", "yearInSchool") SELECT "age", "avatarUrl", "bio", "collegeId", "createdAt", "drinkingPreference", "email", "gender", "id", "name", "personalityIndex", "reliabilityScore", "role", "updatedAt", "yearInSchool" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MixerGroup_mixerId_idx" ON "MixerGroup"("mixerId");

-- CreateIndex
CREATE INDEX "MixerGroup_groupId_idx" ON "MixerGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MixerGroup_mixerId_groupId_key" ON "MixerGroup"("mixerId", "groupId");

-- CreateIndex
CREATE INDEX "MixerRating_mixerId_idx" ON "MixerRating"("mixerId");

-- CreateIndex
CREATE INDEX "MixerRating_ratedGroupId_idx" ON "MixerRating"("ratedGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "MixerRating_mixerId_raterId_ratedGroupId_key" ON "MixerRating"("mixerId", "raterId", "ratedGroupId");

-- CreateIndex
CREATE INDEX "MixerMedia_mixerId_createdAt_idx" ON "MixerMedia"("mixerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CustomActivity_collegeId_isApproved_idx" ON "CustomActivity"("collegeId", "isApproved");

-- CreateIndex
CREATE INDEX "AISuggestion_mixerId_idx" ON "AISuggestion"("mixerId");
