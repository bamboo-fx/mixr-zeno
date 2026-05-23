import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// =====================================================
// SANDBOX SEED SCRIPT
// Creates a realistic environment with fake users,
// groups, mixers, and all relationships for testing
// =====================================================

// First names pool
const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
  "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Abigail", "Michael",
  "Emily", "Daniel", "Elizabeth", "Jacob", "Sofia", "Logan", "Avery",
  "Jackson", "Ella", "Sebastian", "Madison", "Aiden", "Scarlett", "Matthew",
  "Victoria", "Samuel", "Aria", "David", "Grace", "Joseph", "Chloe", "Carter",
  "Camila", "Owen", "Penelope", "Wyatt", "Riley", "John", "Layla", "Jack",
  "Zoey", "Luke", "Nora", "Jayden", "Lily", "Dylan", "Eleanor", "Grayson",
  "Hannah", "Levi", "Lillian", "Isaac", "Addison", "Gabriel", "Aubrey",
  "Julian", "Ellie", "Mateo", "Stella", "Anthony", "Natalie", "Jaxon", "Zoe",
  "Lincoln", "Leah", "Joshua", "Hazel", "Christopher", "Violet", "Andrew",
  "Aurora", "Theodore", "Savannah", "Caleb", "Audrey", "Ryan", "Brooklyn",
  "Asher", "Bella", "Nathan", "Claire", "Thomas", "Skylar", "Leo", "Lucy"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
  "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
  "Roberts", "Chen", "Kim", "Park", "Patel", "Shah", "Kumar", "Singh",
  "Cohen", "Goldberg", "Murphy", "O'Brien", "Sullivan"
];

const GENDERS = ["Man", "Woman", "Non-binary"];
const YEARS: ("freshman" | "sophomore" | "junior" | "senior" | "grad")[] = [
  "freshman", "sophomore", "junior", "senior", "grad"
];
const DRINKING_PREFS: ("sober" | "light" | "flexible" | "heavy")[] = [
  "sober", "light", "flexible", "heavy"
];

const GROUP_CATEGORIES = ["sports", "social", "clubs"];

// Other group types
const SPORTS_CLUBS = [
  "Club Tennis", "Ultimate Frisbee", "Climbing Club", "Rowing Team",
  "Club Soccer", "Club Volleyball", "Running Club", "Swim Club",
  "Lacrosse Club", "Rugby Club", "Cricket Club", "Boxing Club"
];

const ACADEMIC_CLUBS = [
  "Pre-Med Society", "Engineering Club", "Computer Science Society",
  "Business Club", "Economics Association", "Physics Society",
  "Chemistry Club", "Math Society", "Philosophy Club", "History Society"
];

const CULTURAL_ORGS = [
  "Asian Student Union", "Black Student Alliance", "Latino Student Association",
  "Middle Eastern Club", "International Students Org", "Jewish Student Union",
  "Muslim Student Association", "Korean Student Association", "Chinese Students Club",
  "Indian Student Association", "African Student Union", "Caribbean Club"
];

const HOBBY_CLUBS = [
  "Photography Club", "Dance Team", "A Cappella", "Film Society",
  "Theater Club", "Art Collective", "Cooking Club", "Gaming Society",
  "Debate Club", "Outdoor Adventures", "Music Society", "Poetry Collective"
];

const BIOS = [
  "Just trying to make friends and have a good time!",
  "Love meeting new people. Always down for a spontaneous adventure.",
  "Coffee enthusiast and amateur photographer.",
  "Probably reading or at the gym. Say hi!",
  "Music lover, food explorer, good vibes only.",
  "Looking for my people. Tennis anyone?",
  "Not here for drama, just good times.",
  "Aspiring entrepreneur. Let's grab coffee!",
  "Film buff and vinyl collector.",
  "Beach person trapped in a landlocked state.",
  "Future lawyer, current napper.",
  "Dog person. Will befriend you for your pet.",
  "Concert buddy needed. Into indie and electronic.",
  "Foodie always looking for new spots.",
  "Here for the memories and the memes.",
  "Probably at a coffee shop. Come find me!",
  "Sports fan, trivia night champion.",
  "Art history nerd with a Netflix problem.",
  "Morning person but make it social.",
  "Just vibing through college one day at a time.",
];

// Avatar URLs (using placeholder images)
const AVATAR_URLS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1504199367641-aba8151af406?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=200&h=200&fit=crop&crop=face",
];

// Group cover images
const GROUP_COVER_URLS = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1530099486328-e021101a494a?w=800&h=400&fit=crop",
];

// Mixer locations
const LOCATIONS = [
  "Student Union Ballroom", "Main Quad", "Campus Recreation Center",
  "Chapter House", "Downtown Venue", "Rooftop Terrace",
  "College Pub", "Park Pavilion", "Lakeside Deck", "Sports Field",
  "Event Center", "Alumni Hall", "Garden Courtyard", "Beach House"
];

// Helper functions
function randomElement<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("Cannot select from empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomElements<T>(arr: T[], count: number): T[] {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string, domain: string): string {
  const rand = randomInt(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rand}@${domain}`;
}

function generateGroupDescription(name: string, category: string): string {
  const hobbyDescriptions: string[] = [
    `${name} - Share your passion with fellow enthusiasts!`,
    `${name} welcomes all skill levels. Come create, explore, and connect!`,
    `Join ${name} for workshops, meetups, and creative collaboration.`,
  ];
  const descriptions: Record<string, string[]> = {
    sports: [
      `${name} - All skill levels welcome! We compete, train, and have fun together.`,
      `Official ${name}. Practices twice weekly, tournaments monthly.`,
      `${name} - Join us for fitness, competition, and team spirit!`,
    ],
    academic: [
      `${name} - Connecting students, hosting speakers, and building careers.`,
      `Join ${name} for networking, workshops, and study groups.`,
      `${name} - Your community for academic excellence and professional growth.`,
    ],
    cultural: [
      `${name} - Celebrating heritage, building community, fostering understanding.`,
      `Join ${name} for cultural events, food, music, and friendship!`,
      `${name} - Bringing people together through shared culture and experiences.`,
    ],
    hobby: hobbyDescriptions,
    professional: [
      `${name} - Networking, mentorship, and career development.`,
      `${name} - Building tomorrow's leaders today.`,
      `Join ${name} for industry connections and professional growth.`,
    ],
  };
  const categoryDescriptions = descriptions[category];
  if (categoryDescriptions && categoryDescriptions.length > 0) {
    return randomElement(categoryDescriptions);
  }
  return randomElement(hobbyDescriptions);
}

async function main() {
  console.log("🌱 Starting sandbox seed...\n");

  // First, run the base seed to ensure colleges, interests, and activities exist
  console.log("📚 Ensuring base data exists...");

  // Get existing colleges
  const colleges = await db.college.findMany();
  if (colleges.length === 0) {
    console.log("❌ No colleges found. Please run the base seed first: bun prisma db seed");
    process.exit(1);
  }
  console.log(`✅ Found ${colleges.length} colleges`);

  // Get existing interests
  const interests = await db.interest.findMany();
  if (interests.length === 0) {
    console.log("❌ No interests found. Please run the base seed first: bun prisma db seed");
    process.exit(1);
  }
  console.log(`✅ Found ${interests.length} interests`);

  // Get existing activities
  const activities = await db.activity.findMany();
  if (activities.length === 0) {
    console.log("❌ No activities found. Please run the base seed first: bun prisma db seed");
    process.exit(1);
  }
  console.log(`✅ Found ${activities.length} activities\n`);

  // =====================================================
  // CREATE PROFILES (50+ per college = 250+ total)
  // =====================================================
  console.log("👥 Creating profiles...");

  const allProfiles: { id: string; collegeId: string; gender: string; name: string }[] = [];

  for (const college of colleges) {
    const profileCount = randomInt(40, 60);
    const domain = college.verifiedDomain || `${college.name.toLowerCase().replace(/\s+/g, "")}.edu`;

    for (let i = 0; i < profileCount; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const gender = randomElement(GENDERS);
      const name = `${firstName} ${lastName}`;
      const email = generateEmail(firstName, lastName, domain);

      try {
        const profile = await db.profile.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name,
            age: randomInt(18, 24),
            gender,
            collegeId: college.id,
            yearInSchool: randomElement(YEARS),
            drinkingPreference: randomElement(DRINKING_PREFS),
            personalityIndex: Math.random() * 100,
            reliabilityScore: randomInt(60, 100),
            avatarUrl: Math.random() > 0.3 ? randomElement(AVATAR_URLS) : null,
            bio: Math.random() > 0.4 ? randomElement(BIOS) : null,
          },
        });

        // Add 3-8 random interests
        const profileInterests = randomElements(interests, randomInt(3, 8));
        for (const interest of profileInterests) {
          await db.userInterest.upsert({
            where: {
              userId_interestId: { userId: profile.id, interestId: interest.id }
            },
            update: {},
            create: {
              userId: profile.id,
              interestId: interest.id,
            },
          }).catch(() => {}); // Ignore duplicates
        }

        allProfiles.push({
          id: profile.id,
          collegeId: college.id,
          gender,
          name
        });
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created ${allProfiles.length} profiles\n`);

  // =====================================================
  // CREATE GROUPS (10-15 per college)
  // =====================================================
  console.log("🏛️ Creating groups...");

  interface GroupData {
    id: string;
    collegeId: string;
    category: string;
    createdById: string;
  }
  const allGroups: GroupData[] = [];

  for (const college of colleges) {
    const collegeProfiles = allProfiles.filter(p => p.collegeId === college.id);
    if (collegeProfiles.length === 0) continue;

    // Create other groups (2 each category)
    for (const name of randomElements(SPORTS_CLUBS, 2)) {
      const creator = randomElement(collegeProfiles);
      const group = await createGroup(college.id, name, "sports", creator.id);
      if (group) allGroups.push(group);
    }

    for (const name of randomElements(ACADEMIC_CLUBS, 2)) {
      const creator = randomElement(collegeProfiles);
      const group = await createGroup(college.id, name, "academic", creator.id);
      if (group) allGroups.push(group);
    }

    for (const name of randomElements(CULTURAL_ORGS, 2)) {
      const creator = randomElement(collegeProfiles);
      const group = await createGroup(college.id, name, "cultural", creator.id);
      if (group) allGroups.push(group);
    }

    for (const name of randomElements(HOBBY_CLUBS, 2)) {
      const creator = randomElement(collegeProfiles);
      const group = await createGroup(college.id, name, "hobby", creator.id);
      if (group) allGroups.push(group);
    }
  }

  async function createGroup(collegeId: string, name: string, category: string, createdById: string): Promise<GroupData | null> {
    try {
      const group = await db.group.create({
        data: {
          collegeId,
          name,
          description: generateGroupDescription(name, category),
          category,
          coverImageUrl: Math.random() > 0.2 ? randomElement(GROUP_COVER_URLS) : null,
          createdById,
          isVerified: Math.random() > 0.5,
        },
      });

      // Add creator as admin member
      await db.groupMember.create({
        data: {
          groupId: group.id,
          userId: createdById,
          role: "admin",
        },
      });

      return { id: group.id, collegeId, category, createdById };
    } catch {
      return null;
    }
  }

  console.log(`✅ Created ${allGroups.length} groups\n`);

  // =====================================================
  // ADD MEMBERS TO GROUPS (8-25 members each)
  // =====================================================
  console.log("👥 Adding group members...");

  let membershipCount = 0;

  for (const group of allGroups) {
    const collegeProfiles = allProfiles.filter(p => p.collegeId === group.collegeId && p.id !== group.createdById);
    const memberCount = randomInt(8, 25);
    const selectedMembers = randomElements(collegeProfiles, Math.min(memberCount, collegeProfiles.length));

    for (const member of selectedMembers) {
      try {
        await db.groupMember.create({
          data: {
            groupId: group.id,
            userId: member.id,
            role: Math.random() > 0.9 ? "admin" : "member",
          },
        });
        membershipCount++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created ${membershipCount} group memberships\n`);

  // =====================================================
  // CREATE MIXER REQUESTS (3-5 per college)
  // =====================================================
  console.log("📨 Creating mixer requests...");

  let requestCount = 0;

  for (const college of colleges) {
    const collegeGroups = allGroups.filter(g => g.collegeId === college.id);
    if (collegeGroups.length < 2) continue;

    const numRequests = randomInt(3, 5);

    for (let i = 0; i < numRequests; i++) {
      const selectedGroups = randomElements(collegeGroups, 2);
      const groupA = selectedGroups[0];
      const groupB = selectedGroups[1];
      if (!groupA || !groupB) continue;

      const activity = randomElement(activities);

      // Generate a date within the next 2 weeks
      const daysFromNow = randomInt(1, 14);
      const hour = randomInt(18, 22); // Evening hours
      const proposedStart = new Date();
      proposedStart.setDate(proposedStart.getDate() + daysFromNow);
      proposedStart.setHours(hour, 0, 0, 0);

      try {
        await db.mixerRequest.create({
          data: {
            collegeId: college.id,
            requestingGroupId: groupA.id,
            receivingGroupId: groupB.id,
            proposedStart,
            proposedLocation: randomElement(LOCATIONS),
            proposedActivityId: activity.id,
            message: Math.random() > 0.3 ? `Hey! Would love to set up a mixer with your club. Let us know!` : null,
            status: randomElement(["pending", "pending", "pending", "accepted", "declined"]),
            createdById: groupA.createdById,
          },
        });
        requestCount++;
      } catch {
        // Skip errors
      }
    }
  }

  console.log(`✅ Created ${requestCount} mixer requests\n`);

  // =====================================================
  // CREATE CONFIRMED MIXERS (2-4 per college)
  // =====================================================
  console.log("🎉 Creating confirmed mixers...");

  const allMixers: { id: string; collegeId: string; groupAId: string; groupBId: string }[] = [];

  for (const college of colleges) {
    const collegeGroups = allGroups.filter(g => g.collegeId === college.id);
    if (collegeGroups.length < 2) continue;

    const numMixers = randomInt(2, 4);

    for (let i = 0; i < numMixers; i++) {
      const selectedGroups = randomElements(collegeGroups, 2);
      const groupA = selectedGroups[0];
      const groupB = selectedGroups[1];
      if (!groupA || !groupB) continue;

      const activity = randomElement(activities);

      // Mix of past, current, and future mixers
      const daysOffset = randomInt(-7, 14);
      const hour = randomInt(18, 22);
      const scheduledStart = new Date();
      scheduledStart.setDate(scheduledStart.getDate() + daysOffset);
      scheduledStart.setHours(hour, 0, 0, 0);

      let status: string;
      if (daysOffset < 0) {
        status = "completed";
      } else if (daysOffset === 0) {
        status = Math.random() > 0.5 ? "live" : "upcoming";
      } else {
        status = "upcoming";
      }

      try {
        const mixer = await db.mixer.create({
          data: {
            collegeId: college.id,
            groupAId: groupA.id,
            groupBId: groupB.id,
            scheduledStart,
            location: randomElement(LOCATIONS),
            activityId: activity.id,
            status,
            pairingMode: randomElement(["manual", "auto", "hybrid"]),
            pairingLocked: status === "completed" || status === "live",
            liveStartedAt: status === "live" || status === "completed" ? scheduledStart : null,
            completedAt: status === "completed" ? new Date(scheduledStart.getTime() + 3 * 60 * 60 * 1000) : null,
          },
        });

        allMixers.push({
          id: mixer.id,
          collegeId: college.id,
          groupAId: groupA.id,
          groupBId: groupB.id,
        });
      } catch {
        // Skip errors
      }
    }
  }

  console.log(`✅ Created ${allMixers.length} mixers\n`);

  // =====================================================
  // ADD PARTICIPANTS TO MIXERS
  // =====================================================
  console.log("🙋 Adding mixer participants...");

  let participantCount = 0;

  for (const mixer of allMixers) {
    // Get members from both groups
    const groupAMembers = await db.groupMember.findMany({
      where: { groupId: mixer.groupAId },
      select: { userId: true },
    });

    const groupBMembers = await db.groupMember.findMany({
      where: { groupId: mixer.groupBId },
      select: { userId: true },
    });

    // Add 5-15 participants from each group
    const selectedFromA = randomElements(groupAMembers, Math.min(randomInt(5, 15), groupAMembers.length));
    const selectedFromB = randomElements(groupBMembers, Math.min(randomInt(5, 15), groupBMembers.length));

    for (const member of selectedFromA) {
      try {
        await db.mixerParticipant.create({
          data: {
            mixerId: mixer.id,
            userId: member.userId,
            groupId: mixer.groupAId,
            rsvpStatus: randomElement(["going", "going", "going", "maybe"]),
            checkedIn: Math.random() > 0.3,
          },
        });
        participantCount++;
      } catch {
        // Skip duplicates
      }
    }

    for (const member of selectedFromB) {
      try {
        await db.mixerParticipant.create({
          data: {
            mixerId: mixer.id,
            userId: member.userId,
            groupId: mixer.groupBId,
            rsvpStatus: randomElement(["going", "going", "going", "maybe"]),
            checkedIn: Math.random() > 0.3,
          },
        });
        participantCount++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Added ${participantCount} mixer participants\n`);

  // =====================================================
  // CREATE SOME PAIRINGS FOR PAST/LIVE MIXERS
  // =====================================================
  console.log("💕 Creating pairings...");

  let pairingCount = 0;

  for (const mixer of allMixers) {
    const mixerData = await db.mixer.findUnique({
      where: { id: mixer.id },
      select: { status: true },
    });

    if (mixerData?.status !== "completed" && mixerData?.status !== "live") continue;

    const participants = await db.mixerParticipant.findMany({
      where: { mixerId: mixer.id },
      select: { userId: true, groupId: true },
    });

    const groupAParticipants = participants.filter(p => p.groupId === mixer.groupAId);
    const groupBParticipants = participants.filter(p => p.groupId === mixer.groupBId);

    const pairCount = Math.min(groupAParticipants.length, groupBParticipants.length);

    for (let i = 0; i < pairCount; i++) {
      const userA = groupAParticipants[i];
      const userB = groupBParticipants[i];
      if (!userA || !userB) continue;

      try {
        await db.pairing.create({
          data: {
            mixerId: mixer.id,
            userAId: userA.userId,
            userBId: userB.userId,
            revealed: Math.random() > 0.2,
          },
        });
        pairingCount++;
      } catch {
        // Skip errors (unique constraint violations)
      }
    }
  }

  console.log(`✅ Created ${pairingCount} pairings\n`);

  // =====================================================
  // CREATE FEEDBACK FOR COMPLETED MIXERS
  // =====================================================
  console.log("⭐ Creating feedback...");

  let feedbackCount = 0;

  for (const mixer of allMixers) {
    const mixerData = await db.mixer.findUnique({
      where: { id: mixer.id },
      select: { status: true },
    });

    if (mixerData?.status !== "completed") continue;

    const participants = await db.mixerParticipant.findMany({
      where: { mixerId: mixer.id },
      select: { userId: true },
    });

    // ~60% of participants leave feedback
    const feedbackers = participants.filter(() => Math.random() > 0.4);

    for (const participant of feedbackers) {
      try {
        await db.mixerFeedback.create({
          data: {
            mixerId: mixer.id,
            userId: participant.userId,
            conversationRating: randomInt(3, 5),
            activityRating: randomInt(3, 5),
            wouldMixAgain: Math.random() > 0.2,
            notes: Math.random() > 0.7 ? randomElement([
              "Had a great time! Would definitely do this again.",
              "Fun event, met some cool people.",
              "Good vibes, nice venue!",
              "Great activity choice!",
              "Looking forward to the next one!",
            ]) : null,
          },
        });
        feedbackCount++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created ${feedbackCount} feedback entries\n`);

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎊 SANDBOX SEEDING COMPLETE!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Summary:`);
  console.log(`   • ${allProfiles.length} profiles created`);
  console.log(`   • ${allGroups.length} groups created`);
  console.log(`   • ${membershipCount} group memberships`);
  console.log(`   • ${requestCount} mixer requests`);
  console.log(`   • ${allMixers.length} confirmed mixers`);
  console.log(`   • ${participantCount} mixer participants`);
  console.log(`   • ${pairingCount} pairings`);
  console.log(`   • ${feedbackCount} feedback entries`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
