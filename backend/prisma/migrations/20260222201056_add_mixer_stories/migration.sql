-- CreateTable
CREATE TABLE "MixerStory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "mixerId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MixerStory_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerStory_mixerId_fkey" FOREIGN KEY ("mixerId") REFERENCES "Mixer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerStory_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MixerStory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MixerStory_collegeId_createdAt_idx" ON "MixerStory"("collegeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MixerStory_mixerId_createdAt_idx" ON "MixerStory"("mixerId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MixerStory_expiresAt_idx" ON "MixerStory"("expiresAt");

-- CreateIndex
CREATE INDEX "MixerStory_isDeleted_idx" ON "MixerStory"("isDeleted");
