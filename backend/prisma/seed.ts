import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ---- Colleges ----
  const colleges = await Promise.all([
    db.college.upsert({
      where: { id: "college-stanford" },
      update: {},
      create: {
        id: "college-stanford",
        name: "Stanford University",
        state: "CA",
        verifiedDomain: "stanford.edu",
      },
    }),
    db.college.upsert({
      where: { id: "college-ucla" },
      update: {},
      create: {
        id: "college-ucla",
        name: "UCLA",
        state: "CA",
        verifiedDomain: "ucla.edu",
      },
    }),
    db.college.upsert({
      where: { id: "college-mit" },
      update: {},
      create: {
        id: "college-mit",
        name: "MIT",
        state: "MA",
        verifiedDomain: "mit.edu",
      },
    }),
    db.college.upsert({
      where: { id: "college-harvard" },
      update: {},
      create: {
        id: "college-harvard",
        name: "Harvard University",
        state: "MA",
        verifiedDomain: "harvard.edu",
      },
    }),
    db.college.upsert({
      where: { id: "college-ut-austin" },
      update: {},
      create: {
        id: "college-ut-austin",
        name: "UT Austin",
        state: "TX",
        verifiedDomain: "utexas.edu",
      },
    }),
  ]);

  console.log(`Seeded ${colleges.length} colleges`);

  // ---- Interests ----
  const interestNames = [
    "Hiking",
    "Basketball",
    "Soccer",
    "Yoga",
    "Swimming",
    "Gaming",
    "Chess",
    "Cooking",
    "Baking",
    "Photography",
    "Music",
    "Guitar",
    "Piano",
    "Painting",
    "Drawing",
    "Reading",
    "Writing",
    "Poetry",
    "Film",
    "Theater",
    "Comedy",
    "Dancing",
    "Fashion",
    "Travel",
    "Languages",
    "Coding",
    "Robotics",
    "AI/ML",
    "Entrepreneurship",
    "Finance",
    "Economics",
    "Politics",
    "Volunteering",
    "Environmental Activism",
    "Astronomy",
    "Biology",
    "Chemistry",
    "Physics",
    "Psychology",
    "Philosophy",
    "History",
    "Anime",
    "K-pop",
    "Podcasts",
    "Fitness",
    "Rock Climbing",
    "Cycling",
    "Running",
    "Meditation",
    "Thrifting",
  ];

  const interests = await Promise.all(
    interestNames.map((name) =>
      db.interest.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log(`Seeded ${interests.length} interests`);

  // ---- Activities ----
  type ActivityCreateInput = {
    name: string;
    category: string;
    description: string;
    instructions: string;
    supplies?: string;
    minPeople: number;
    maxPeople: number;
    energyLevel: number;
    alcoholRelated: boolean;
    durationMinutes: number;
  };

  const activitiesData: ActivityCreateInput[] = [
    // drinking_game
    {
      name: "Beer Pong",
      category: "drinking_game",
      description: "Classic cup-and-ball drinking game.",
      instructions:
        "Set up 10 cups in a triangle on each side. Teams take turns throwing ping pong balls into cups. When a cup is made, the other team drinks it. First team to eliminate all opponent cups wins.",
      supplies: "Solo cups, ping pong balls, beer or non-alcoholic beverages",
      minPeople: 4,
      maxPeople: 20,
      energyLevel: 3,
      alcoholRelated: true,
      durationMinutes: 45,
    },
    {
      name: "Kings Cup",
      category: "drinking_game",
      description: "Card-based group drinking game with fun rules.",
      instructions:
        "Place a large cup in the center and spread a deck of cards around it. Each card has a rule. Players take turns drawing cards and following the rule. Fill the king's cup when all four kings are drawn.",
      supplies: "Deck of cards, cups, beverages",
      minPeople: 4,
      maxPeople: 12,
      energyLevel: 2,
      alcoholRelated: true,
      durationMinutes: 60,
    },
    {
      name: "Flip Cup",
      category: "drinking_game",
      description: "Relay race drinking game played in teams.",
      instructions:
        "Two teams line up on opposite sides of a table. Each player drinks their cup and then flips it upside down on the table edge. The next player cannot start until the previous player's cup is flipped. First team to finish wins.",
      supplies: "Solo cups, beverages",
      minPeople: 6,
      maxPeople: 30,
      energyLevel: 4,
      alcoholRelated: true,
      durationMinutes: 30,
    },
    {
      name: "Sober Trivia Showdown",
      category: "drinking_game",
      description: "Trivia game with fun forfeits instead of drinks.",
      instructions:
        "Teams compete to answer trivia questions. Wrong answers result in fun dares or challenges instead of drinks. Points accumulate and the winning team chooses a fun activity for the losers.",
      supplies: "Trivia question cards or phone app",
      minPeople: 6,
      maxPeople: 40,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 60,
    },
    // icebreaker
    {
      name: "Two Truths and a Lie",
      category: "icebreaker",
      description: "Classic getting-to-know-you game.",
      instructions:
        "Each person shares three statements about themselves - two true and one false. Others guess which statement is the lie. The person reveals the answer and shares a fun story.",
      minPeople: 4,
      maxPeople: 30,
      energyLevel: 1,
      alcoholRelated: false,
      durationMinutes: 30,
    },
    {
      name: "Speed Friending",
      category: "icebreaker",
      description: "Speed dating format for making new friends.",
      instructions:
        "Participants sit across from each other and have 3 minutes to chat. A bell signals rotation. Keep rotating until everyone has met. End with a vote on who you want to learn more about.",
      minPeople: 8,
      maxPeople: 50,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 45,
    },
    {
      name: "Human Bingo",
      category: "icebreaker",
      description: "Bingo cards filled with personality traits and experiences.",
      instructions:
        "Each person gets a bingo card with traits like 'has been to Europe' or 'plays guitar'. Mingle and find people who match each square. First to get bingo wins a prize.",
      supplies: "Printed bingo cards, pens",
      minPeople: 10,
      maxPeople: 50,
      energyLevel: 3,
      alcoholRelated: false,
      durationMinutes: 30,
    },
    {
      name: "Would You Rather",
      category: "icebreaker",
      description: "Fun dilemma questions to spark conversation.",
      instructions:
        "A facilitator reads dilemma questions. Participants split into two groups based on their answer and briefly defend their choice. Rotate through 10-15 questions.",
      minPeople: 6,
      maxPeople: 60,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 25,
    },
    // competition
    {
      name: "Trivia Bowl",
      category: "competition",
      description: "Multi-round group trivia competition.",
      instructions:
        "Divide into teams of 4-6. Run 5 rounds of trivia covering pop culture, history, science, and campus life. Teams submit written answers per round. Tally scores after each round. Top team wins.",
      supplies: "Question sheets, answer sheets, pens, scoreboard",
      minPeople: 8,
      maxPeople: 60,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 90,
    },
    {
      name: "Scavenger Hunt",
      category: "competition",
      description: "Campus-wide photo scavenger hunt in teams.",
      instructions:
        "Teams of 4 receive a list of 20 items/actions to photograph on campus. They have 60 minutes to complete as many as possible. Photos must include all team members. Most creative photos earn bonus points.",
      supplies: "Printed clue sheets, smartphones",
      minPeople: 8,
      maxPeople: 40,
      energyLevel: 4,
      alcoholRelated: false,
      durationMinutes: 90,
    },
    {
      name: "Charades Championship",
      category: "competition",
      description: "Classic charades played in a tournament bracket.",
      instructions:
        "Teams take turns acting out words and phrases without speaking. Each correct guess in 60 seconds earns a point. Run a bracket tournament until a champion team emerges.",
      minPeople: 8,
      maxPeople: 30,
      energyLevel: 3,
      alcoholRelated: false,
      durationMinutes: 60,
    },
    {
      name: "Lip Sync Battle",
      category: "competition",
      description: "Teams perform epic lip sync performances for the crowd.",
      instructions:
        "Groups of 3-5 rehearse for 20 minutes then perform a lip sync to any song. Audience votes on energy, creativity, and performance. Top 3 acts compete in a final round.",
      supplies: "Bluetooth speaker, phone with music",
      minPeople: 10,
      maxPeople: 50,
      energyLevel: 5,
      alcoholRelated: false,
      durationMinutes: 75,
    },
    // themed
    {
      name: "Decade Night",
      category: "themed",
      description: "A themed social set in a specific decade.",
      instructions:
        "Pick a decade (70s, 80s, 90s, 2000s). Dress the part, play music from the era, and set up themed games and activities. Trivia about the decade is a great addition.",
      supplies: "Decade-appropriate decorations, playlist",
      minPeople: 10,
      maxPeople: 100,
      energyLevel: 3,
      alcoholRelated: false,
      durationMinutes: 120,
    },
    {
      name: "Around the World",
      category: "themed",
      description: "Travel-themed social with stations for different countries.",
      instructions:
        "Set up 5-8 stations each representing a country with a themed drink or snack and a cultural game or fact. Participants rotate through all stations over the evening.",
      supplies: "Country-specific decorations, food and drink",
      minPeople: 20,
      maxPeople: 100,
      energyLevel: 3,
      alcoholRelated: false,
      durationMinutes: 120,
    },
    {
      name: "Murder Mystery Night",
      category: "themed",
      description: "Interactive murder mystery party game.",
      instructions:
        "Assign roles to all attendees before the event. Participants stay in character while mingling, sharing clues, and deducing the murderer. Vote for the culprit at the end.",
      supplies: "Role cards, clue packets",
      minPeople: 10,
      maxPeople: 40,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 120,
    },
    // lowkey
    {
      name: "Board Game Night",
      category: "lowkey",
      description: "Casual evening playing a variety of board games.",
      instructions:
        "Set up stations with different board games. Participants choose games and play freely throughout the night. Rotate tables every 30-45 minutes to meet new people.",
      supplies: "Board games (Codenames, Settlers of Catan, Jenga, etc.)",
      minPeople: 6,
      maxPeople: 40,
      energyLevel: 1,
      alcoholRelated: false,
      durationMinutes: 120,
    },
    {
      name: "Movie Night Under the Stars",
      category: "lowkey",
      description: "Outdoor movie screening with cozy vibes.",
      instructions:
        "Set up a projector outdoors or in a large common space. Provide blankets and snacks. Screen a popular or cult classic film. Have a post-movie discussion about favorite scenes.",
      supplies: "Projector, screen or white wall, blankets, snacks",
      minPeople: 6,
      maxPeople: 60,
      energyLevel: 1,
      alcoholRelated: false,
      durationMinutes: 150,
    },
    {
      name: "Paint and Sip",
      category: "lowkey",
      description: "Guided painting session with beverages.",
      instructions:
        "A host guides participants through painting a simple scene step by step. Beverages (alcoholic or non-alcoholic) are optional. Display all finished paintings at the end.",
      supplies: "Canvas, paints, brushes, cups of water, aprons",
      minPeople: 6,
      maxPeople: 30,
      energyLevel: 1,
      alcoholRelated: false,
      durationMinutes: 90,
    },
    {
      name: "Open Mic Night",
      category: "lowkey",
      description: "Casual open mic for music, poetry, and comedy.",
      instructions:
        "Set up a small stage or performance area. Participants sign up to perform a 3-5 minute act. Any talent welcome: music, poetry, stand-up, spoken word. Supportive audience required.",
      supplies: "Microphone, small speaker",
      minPeople: 8,
      maxPeople: 50,
      energyLevel: 2,
      alcoholRelated: false,
      durationMinutes: 90,
    },
    {
      name: "Cooking Challenge",
      category: "lowkey",
      description: "Teams compete to make the best dish with mystery ingredients.",
      instructions:
        "Reveal 5 mystery ingredients. Teams of 3-4 have 45 minutes to create a dish using all ingredients. A panel of judges taste and score each dish on creativity, taste, and presentation.",
      supplies: "Kitchen access, mystery ingredients, judges",
      minPeople: 8,
      maxPeople: 24,
      energyLevel: 3,
      alcoholRelated: false,
      durationMinutes: 90,
    },
  ];

  const activities = await Promise.all(
    activitiesData.map((data) =>
      db.activity.upsert({
        where: { id: `activity-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
        update: {},
        create: {
          id: `activity-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          ...data,
        },
      })
    )
  );

  console.log(`Seeded ${activities.length} activities`);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
