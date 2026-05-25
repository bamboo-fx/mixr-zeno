// Mock data seed for the design refresh.
// Creates 5C colleges, sample groups, and an upcoming mixer / open mixers
// so the redesigned UI has something to render.
//
// Run with: bun run prisma/seed-mock.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const USER_EMAIL = "zbang28@students.claremontmckenna.edu";

async function main() {
  console.log("Seeding mock data for design refresh...");

  // ── Colleges (5C) ────────────────────────────────────────────────
  const colleges = [
    { id: "college-pomona",   name: "Pomona College" },
    { id: "college-scripps",  name: "Scripps College" },
    { id: "college-cmc",      name: "Claremont McKenna" },
    { id: "college-hmc",      name: "Harvey Mudd" },
    { id: "college-pitzer",   name: "Pitzer College" },
  ];
  for (const c of colleges) {
    await db.college.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: c,
    });
  }
  console.log("  ✓ colleges");

  // ── Activities ───────────────────────────────────────────────────
  const activities = [
    { id: "act-karaoke",   name: "Karaoke Battle",    category: "social",  description: "Sing-off in teams.",        instructions: "Pick songs, take turns, vote winners.",                 energyLevel: 4, durationMinutes: 90  },
    { id: "act-werewolf",  name: "Werewolf",          category: "games",   description: "Social deduction game.",     instructions: "Moderator runs the rounds.",                            energyLevel: 3, durationMinutes: 60  },
    { id: "act-pong",      name: "Pong Tournament",   category: "games",   description: "Beer-pong bracket.",         instructions: "Single elimination, winner stays.",                     energyLevel: 4, durationMinutes: 90  },
    { id: "act-movie",     name: "Movie Night",       category: "chill",   description: "Pick a movie and chill.",    instructions: "Vote in advance, hit play, debrief at the end.",       energyLevel: 1, durationMinutes: 120 },
  ];
  for (const a of activities) {
    await db.activity.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }
  console.log("  ✓ activities");

  // ── Find or create the test user profile ─────────────────────────
  const myProfile = await db.profile.findUnique({ where: { email: USER_EMAIL } });
  if (!myProfile) {
    console.log(`  ⚠ user ${USER_EMAIL} not found — sign up in the app first, then re-run this seed.`);
    return;
  }
  // Make sure their college is CMC
  await db.profile.update({
    where: { id: myProfile.id },
    data: { collegeId: "college-cmc" },
  });
  console.log("  ✓ user profile linked to CMC");

  // ── Groups ───────────────────────────────────────────────────────
  const groups = [
    { id: "grp-po-soccer",   name: "PO Men's Soccer",    collegeId: "college-pomona",  category: "sports", description: "Men's soccer team" },
    { id: "grp-scripps-lit", name: "Scripps Lit Society", collegeId: "college-scripps", category: "club",   description: "Literary society" },
    { id: "grp-cmc-debate",  name: "CMC Debate",          collegeId: "college-cmc",     category: "club",   description: "Forensics & debate" },
    { id: "grp-hmc-robotics",name: "HMC Robotics",        collegeId: "college-hmc",     category: "club",   description: "Build & compete" },
  ];
  for (const g of groups) {
    await db.group.upsert({
      where: { id: g.id },
      update: { name: g.name, collegeId: g.collegeId, category: g.category, description: g.description },
      create: { ...g, createdById: myProfile.id },
    });
  }
  console.log("  ✓ groups");

  // ── Memberships — put user in CMC Debate (as social chair) ───────
  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: "grp-cmc-debate", userId: myProfile.id } },
    update: { role: "social_chair" },
    create: { groupId: "grp-cmc-debate", userId: myProfile.id, role: "social_chair" },
  });
  console.log("  ✓ user is social chair of CMC Debate");

  // ── Upcoming mixer: PO Soccer × Scripps Lit ──────────────────────
  const mixerStart = new Date();
  mixerStart.setDate(mixerStart.getDate() + 3);
  mixerStart.setHours(21, 0, 0, 0);
  const mixerEnd = new Date(mixerStart);
  mixerEnd.setHours(23, 30, 0, 0);

  await db.mixer.upsert({
    where: { id: "mixer-demo-1" },
    update: {
      scheduledStart: mixerStart,
      scheduledEnd: mixerEnd,
      location: "Frary",
      status: "upcoming",
      activityId: "act-karaoke",
      groupAId: "grp-cmc-debate",
      groupBId: "grp-scripps-lit",
    },
    create: {
      id: "mixer-demo-1",
      collegeId: "college-cmc",
      groupAId: "grp-cmc-debate",
      groupBId: "grp-scripps-lit",
      scheduledStart: mixerStart,
      scheduledEnd: mixerEnd,
      location: "Frary",
      status: "upcoming",
      activityId: "act-karaoke",
      pairingMode: "auto",
    },
  });
  // RSVP the user to it (in their group)
  await db.mixerParticipant.upsert({
    where: { mixerId_userId_groupId: { mixerId: "mixer-demo-1", userId: myProfile.id, groupId: "grp-cmc-debate" } },
    update: { rsvpStatus: "going" },
    create: { mixerId: "mixer-demo-1", userId: myProfile.id, groupId: "grp-cmc-debate", rsvpStatus: "going" },
  });
  console.log("  ✓ upcoming mixer: PO Soccer × Scripps Lit @ Frary");

  // ── Open mixers for Discover tab ────────────────────────────────
  const openMixerData = [
    { id: "om-1", title: "Friday Pong Bracket",   description: "Best 4-person teams. Winner takes the trophy.", activityId: "act-pong",     location: "Stover 1",     backgroundImage: "party",   color: "#FF4D5E", maxCapacity: 32, offsetDays: 2 },
    { id: "om-2", title: "Sunset Beach Day",      description: "Linen, frisbee, sandwiches. Bring sunscreen.",  activityId: "act-movie",    location: "Newport Beach",backgroundImage: "outdoor", color: "#FFB547", maxCapacity: 50, offsetDays: 5 },
    { id: "om-3", title: "Indie Sleaze Karaoke",  description: "2008 vibes only. Flash photos encouraged.",     activityId: "act-karaoke",  location: "The Hub",      backgroundImage: "party",   color: "#4F7CFF", maxCapacity: 40, offsetDays: 7 },
  ];

  for (const om of openMixerData) {
    const start = new Date();
    start.setDate(start.getDate() + om.offsetDays);
    start.setHours(20, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 0, 0, 0);

    await db.openMixer.upsert({
      where: { id: om.id },
      update: {
        title: om.title,
        description: om.description,
        activityId: om.activityId,
        location: om.location,
        scheduledStart: start,
        scheduledEnd: end,
        backgroundImage: om.backgroundImage,
        color: om.color,
        maxCapacity: om.maxCapacity,
      },
      create: {
        id: om.id,
        hostId: myProfile.id,
        title: om.title,
        description: om.description,
        activityId: om.activityId,
        location: om.location,
        scheduledStart: start,
        scheduledEnd: end,
        backgroundImage: om.backgroundImage,
        color: om.color,
        maxCapacity: om.maxCapacity,
        status: "open",
      },
    });
  }
  console.log(`  ✓ ${openMixerData.length} open mixers`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
