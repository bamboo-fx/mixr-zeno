import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const db = new PrismaClient();

// Helper to download placeholder images
async function downloadImage(url: string, destPath: string): Promise<void> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);
    protocol
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // Delete the file on error
        reject(err);
      });
  });
}

// Generate a simple colored placeholder image as base64
function generatePlaceholderImage(): Buffer {
  // Simple 100x100 solid color PNG (minimal valid PNG)
  // This is a tiny purple placeholder
  const width = 400;
  const height = 600;

  // Create a simple PPM image and convert concept
  // For simplicity, we'll create a minimal valid JPEG-like structure
  // Actually, let's just use a pre-made tiny image bytes

  // Minimal 1x1 purple PNG
  const purplePng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // 8-bit RGB
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xd7, 0x63, 0xa8, 0x6a, 0xf8, 0x0f, 0x00, // compressed purple pixel
    0x02, 0x0d, 0x01, 0x83, 0x8a, 0x25, 0x9b, 0xc9,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82
  ]);

  return purplePng;
}

async function main() {
  console.log("🌱 Seeding database with demo data for Stories...");

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads/stories");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // ---- College ----
  const stanford = await db.college.upsert({
    where: { id: "college-stanford" },
    update: {},
    create: {
      id: "college-stanford",
      name: "Stanford University",
      state: "CA",
      verifiedDomain: "stanford.edu",
    },
  });
  console.log("✓ College: Stanford");

  // ---- Demo Profiles ----
  const profiles = await Promise.all([
    db.profile.upsert({
      where: { email: "demo@stanford.edu" },
      update: {},
      create: {
        id: "profile-demo",
        email: "demo@stanford.edu",
        name: "Demo User",
        age: 21,
        gender: "other",
        collegeId: stanford.id,
        yearInSchool: "Junior",
        relationshipStatus: "single",
        bio: "Just here for the mixers!",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=demo",
      },
    }),
    db.profile.upsert({
      where: { email: "alex@stanford.edu" },
      update: {},
      create: {
        id: "profile-alex",
        email: "alex@stanford.edu",
        name: "Alex Chen",
        age: 20,
        gender: "male",
        collegeId: stanford.id,
        yearInSchool: "Sophomore",
        relationshipStatus: "single",
        bio: "CS major, love hiking and basketball",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=alex",
      },
    }),
    db.profile.upsert({
      where: { email: "maya@stanford.edu" },
      update: {},
      create: {
        id: "profile-maya",
        email: "maya@stanford.edu",
        name: "Maya Patel",
        age: 21,
        gender: "female",
        collegeId: stanford.id,
        yearInSchool: "Junior",
        relationshipStatus: "taken",
        bio: "Art history + tennis enthusiast",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=maya",
      },
    }),
    db.profile.upsert({
      where: { email: "jordan@stanford.edu" },
      update: {},
      create: {
        id: "profile-jordan",
        email: "jordan@stanford.edu",
        name: "Jordan Kim",
        age: 22,
        gender: "non-binary",
        collegeId: stanford.id,
        yearInSchool: "Senior",
        relationshipStatus: "complicated",
        bio: "Film nerd, coffee addict",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=jordan",
      },
    }),
    db.profile.upsert({
      where: { email: "sam@stanford.edu" },
      update: {},
      create: {
        id: "profile-sam",
        email: "sam@stanford.edu",
        name: "Sam Rodriguez",
        age: 19,
        gender: "male",
        collegeId: stanford.id,
        yearInSchool: "Freshman",
        relationshipStatus: "single",
        bio: "Pre-med, gym rat",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=sam",
      },
    }),
    db.profile.upsert({
      where: { email: "emma@stanford.edu" },
      update: {},
      create: {
        id: "profile-emma",
        email: "emma@stanford.edu",
        name: "Emma Wilson",
        age: 20,
        gender: "female",
        collegeId: stanford.id,
        yearInSchool: "Sophomore",
        relationshipStatus: "single",
        bio: "Environmental science, loves nature",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=emma",
      },
    }),
  ]);
  console.log(`✓ ${profiles.length} Profiles created`);

  // ---- Demo Groups ----
  const groups = await Promise.all([
    db.group.upsert({
      where: { id: "group-alpha-phi" },
      update: {},
      create: {
        id: "group-alpha-phi",
        collegeId: stanford.id,
        name: "Alpha Phi",
        description: "A sisterhood of inspiring women",
        category: "social",
        createdById: "profile-maya",
        avgStarRating: 4.5,
        totalRatings: 12,
      },
    }),
    db.group.upsert({
      where: { id: "group-sigma-chi" },
      update: {},
      create: {
        id: "group-sigma-chi",
        collegeId: stanford.id,
        name: "Sigma Chi",
        description: "Brotherhood and lifelong friendships",
        category: "social",
        createdById: "profile-alex",
        avgStarRating: 4.2,
        totalRatings: 15,
      },
    }),
    db.group.upsert({
      where: { id: "group-cs-club" },
      update: {},
      create: {
        id: "group-cs-club",
        collegeId: stanford.id,
        name: "CS Club",
        description: "Stanford's largest computer science community",
        category: "academic",
        createdById: "profile-jordan",
        avgStarRating: 4.8,
        totalRatings: 8,
      },
    }),
    db.group.upsert({
      where: { id: "group-tennis-team" },
      update: {},
      create: {
        id: "group-tennis-team",
        collegeId: stanford.id,
        name: "Tennis Club",
        description: "Recreational tennis for all skill levels",
        category: "sports",
        createdById: "profile-sam",
        avgStarRating: 4.6,
        totalRatings: 10,
      },
    }),
  ]);
  console.log(`✓ ${groups.length} Groups created`);

  // ---- Group Members (with roles) ----
  const memberData = [
    // Alpha Phi members
    { groupId: "group-alpha-phi", userId: "profile-maya", role: "social_chair" },
    { groupId: "group-alpha-phi", userId: "profile-emma", role: "member" },
    { groupId: "group-alpha-phi", userId: "profile-demo", role: "member" },
    // Sigma Chi members
    { groupId: "group-sigma-chi", userId: "profile-alex", role: "social_chair" },
    { groupId: "group-sigma-chi", userId: "profile-sam", role: "member" },
    // CS Club members
    { groupId: "group-cs-club", userId: "profile-jordan", role: "admin" },
    { groupId: "group-cs-club", userId: "profile-alex", role: "member" },
    { groupId: "group-cs-club", userId: "profile-demo", role: "member" },
    // Tennis Club members
    { groupId: "group-tennis-team", userId: "profile-sam", role: "social_chair" },
    { groupId: "group-tennis-team", userId: "profile-maya", role: "member" },
  ];

  for (const m of memberData) {
    await db.groupMember.upsert({
      where: { groupId_userId: { groupId: m.groupId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }
  console.log(`✓ ${memberData.length} Group memberships created`);

  // ---- Activity ----
  const activity = await db.activity.upsert({
    where: { id: "activity-speed-friending" },
    update: {},
    create: {
      id: "activity-speed-friending",
      name: "Speed Friending",
      category: "icebreaker",
      description: "Speed dating format for making new friends",
      instructions: "Participants sit across from each other and have 3 minutes to chat.",
      minPeople: 8,
      maxPeople: 50,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 45,
    },
  });
  console.log("✓ Activity created");

  // ---- LIVE Mixer (this is critical for Stories to work!) ----
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const liveMixer = await db.mixer.upsert({
    where: { id: "mixer-live-demo" },
    update: {
      status: "live",
      liveStartedAt: twoHoursAgo,
      scheduledStart: twoHoursAgo,
    },
    create: {
      id: "mixer-live-demo",
      collegeId: stanford.id,
      groupAId: "group-alpha-phi",
      groupBId: "group-sigma-chi",
      scheduledStart: twoHoursAgo,
      location: "Roble Hall Lounge",
      activityId: activity.id,
      status: "live", // LIVE status is required for story posting!
      pairingMode: "smart",
      pairingLocked: false,
      liveStartedAt: twoHoursAgo,
    },
  });
  console.log("✓ LIVE Mixer created (stories can be posted!)");

  // ---- Mixer Participants (RSVP 'going' required for story posting) ----
  const participantData = [
    { mixerId: liveMixer.id, userId: "profile-maya", groupId: "group-alpha-phi", rsvpStatus: "going" },
    { mixerId: liveMixer.id, userId: "profile-emma", groupId: "group-alpha-phi", rsvpStatus: "going" },
    { mixerId: liveMixer.id, userId: "profile-demo", groupId: "group-alpha-phi", rsvpStatus: "going" },
    { mixerId: liveMixer.id, userId: "profile-alex", groupId: "group-sigma-chi", rsvpStatus: "going" },
    { mixerId: liveMixer.id, userId: "profile-sam", groupId: "group-sigma-chi", rsvpStatus: "going" },
  ];

  for (const p of participantData) {
    await db.mixerParticipant.upsert({
      where: { mixerId_userId_groupId: { mixerId: p.mixerId, userId: p.userId, groupId: p.groupId } },
      update: { rsvpStatus: p.rsvpStatus },
      create: p,
    });
  }
  console.log(`✓ ${participantData.length} Mixer participants (RSVP going)`);

  // ---- Create Demo Stories ----
  // Generate placeholder images for stories
  const storyFiles = [
    "demo-story-1.png",
    "demo-story-2.png",
    "demo-story-3.png",
  ];

  for (const filename of storyFiles) {
    const filepath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, generatePlaceholderImage());
    }
  }
  console.log("✓ Placeholder story images created");

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  const storyData = [
    {
      id: "story-demo-1",
      collegeId: stanford.id,
      mixerId: liveMixer.id,
      uploaderId: "profile-maya",
      groupId: "group-alpha-phi",
      storagePath: "uploads/stories/demo-story-1.png",
      mediaType: "image",
      width: 400,
      height: 600,
      expiresAt,
      isDeleted: false,
    },
    {
      id: "story-demo-2",
      collegeId: stanford.id,
      mixerId: liveMixer.id,
      uploaderId: "profile-alex",
      groupId: "group-sigma-chi",
      storagePath: "uploads/stories/demo-story-2.png",
      mediaType: "image",
      width: 400,
      height: 600,
      expiresAt,
      isDeleted: false,
    },
    {
      id: "story-demo-3",
      collegeId: stanford.id,
      mixerId: liveMixer.id,
      uploaderId: "profile-emma",
      groupId: "group-alpha-phi",
      storagePath: "uploads/stories/demo-story-3.png",
      mediaType: "image",
      width: 400,
      height: 600,
      expiresAt,
      isDeleted: false,
    },
  ];

  for (const story of storyData) {
    await db.mixerStory.upsert({
      where: { id: story.id },
      update: { expiresAt: story.expiresAt, isDeleted: false },
      create: story,
    });
  }
  console.log(`✓ ${storyData.length} Demo stories created`);

  // ---- Add Story Reactions ----
  const reactionData = [
    { id: "reaction-1", collegeId: stanford.id, storyId: "story-demo-1", reactorId: "profile-alex", reaction: "fire" },
    { id: "reaction-2", collegeId: stanford.id, storyId: "story-demo-1", reactorId: "profile-sam", reaction: "party" },
    { id: "reaction-3", collegeId: stanford.id, storyId: "story-demo-2", reactorId: "profile-maya", reaction: "love" },
    { id: "reaction-4", collegeId: stanford.id, storyId: "story-demo-2", reactorId: "profile-emma", reaction: "fire" },
  ];

  for (const r of reactionData) {
    await db.storyReaction.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log(`✓ ${reactionData.length} Story reactions created`);

  // ---- Update Demo Profile to be at Stanford with group memberships ----
  await db.profile.update({
    where: { id: "profile-demo" },
    data: {
      collegeId: stanford.id,
    },
  });

  console.log("\n🎉 Demo seed complete!");
  console.log("\n📋 Summary:");
  console.log("   - 1 College (Stanford)");
  console.log("   - 6 Profiles with avatars");
  console.log("   - 4 Groups (Alpha Phi, Sigma Chi, CS Club, Tennis)");
  console.log("   - 1 LIVE Mixer (Alpha Phi × Sigma Chi)");
  console.log("   - 5 Participants (RSVP going - can post stories)");
  console.log("   - 3 Demo Stories with reactions");
  console.log("\n✅ Stories should now appear in the app!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
