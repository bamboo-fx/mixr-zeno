import { hungarian } from "./hungarian.js";

export interface PairingFeatures {
  sharedInterestsCount: number;
  drinkingMatch: number;      // 0 or 1
  yearMatch: number;          // 0 or 1
  reliabilitySimilarity: number; // 1 - abs(a.reliabilityScore - b.reliabilityScore)
  energyPersonalityMatch: number; // based on activity energyLevel + personality indices
  blockFlag: boolean;
  // Story engagement features
  engagementSimilarity: number; // 1 - abs(userA_activity - userB_activity)
  highEnergyPairBonus: number; // bonus for high-energy matches
  engagementMismatchPenalty: number; // penalty for mismatched engagement
}

export interface UserEngagementStats {
  storyPostsLast30d: number;
  reactionsGivenLast30d: number;
  reactionsReceivedLast30d: number;
}

// Calculate normalized story activity (0-1 scale)
export function normalizeStoryActivity(stats: UserEngagementStats | null): number {
  if (!stats) return 0.5; // neutral default

  const total = stats.storyPostsLast30d + stats.reactionsGivenLast30d + stats.reactionsReceivedLast30d;
  // Normalize using a soft cap (diminishing returns after ~50 total activities)
  return Math.min(1, total / 50);
}

// Determine engagement quartile (1-4, where 4 is highest)
export function getEngagementQuartile(normalizedActivity: number): number {
  if (normalizedActivity >= 0.75) return 4;
  if (normalizedActivity >= 0.5) return 3;
  if (normalizedActivity >= 0.25) return 2;
  return 1;
}

export function computePairingScore(features: PairingFeatures): number {
  if (features.blockFlag) return -Infinity;
  return (
    features.sharedInterestsCount * 3 +
    features.drinkingMatch * 4 +
    features.yearMatch * 2 +
    features.reliabilitySimilarity * 2 +
    features.energyPersonalityMatch * 3 +
    // New engagement features
    features.engagementSimilarity * 2.5 +
    features.highEnergyPairBonus * 1.5 -
    features.engagementMismatchPenalty * 2.0
  );
}

interface ProfileLike {
  id: string;
  drinkingPreference: string;
  yearInSchool: string | null;
  personalityIndex: number;
  reliabilityScore: number;
  interests: { interestId: string }[];
  engagementStats?: UserEngagementStats | null;
}

interface ActivityLike {
  energyLevel: number;
}

export function computeFeatures(
  userA: ProfileLike,
  userB: ProfileLike,
  activity: ActivityLike | null,
  blocks: [string, string][],
): PairingFeatures {
  const blockFlag = blocks.some(
    ([bkr, bkd]) =>
      (bkr === userA.id && bkd === userB.id) ||
      (bkr === userB.id && bkd === userA.id),
  );

  const interestSetA = new Set(userA.interests.map((i) => i.interestId));
  const sharedInterestsCount = userB.interests.filter((i) =>
    interestSetA.has(i.interestId),
  ).length;

  const drinkingMatch =
    userA.drinkingPreference === userB.drinkingPreference ||
    userA.drinkingPreference === "flexible" ||
    userB.drinkingPreference === "flexible"
      ? 1
      : 0;

  const yearMatch = userA.yearInSchool === userB.yearInSchool ? 1 : 0;

  const reliabilitySimilarity =
    1 - Math.abs(userA.reliabilityScore - userB.reliabilityScore);

  // energyPersonalityMatch: how well personality indices complement given activity energy
  // activity energyLevel is 1-5; personalityIndex is 0-1
  // High-energy activities favour extroverts (personality > 0.5)
  // Low-energy activities favour introverts (personality < 0.5)
  let energyPersonalityMatch = 0;
  if (activity !== null) {
    const normalizedEnergy = (activity.energyLevel - 1) / 4; // 0..1
    const avgPersonality = (userA.personalityIndex + userB.personalityIndex) / 2;
    // Closeness: 1 when both match, 0 when opposite
    energyPersonalityMatch = 1 - Math.abs(normalizedEnergy - avgPersonality);
  } else {
    // No activity: neutral match based on personality similarity
    energyPersonalityMatch =
      1 - Math.abs(userA.personalityIndex - userB.personalityIndex);
  }

  // Engagement features
  const activityA = normalizeStoryActivity(userA.engagementStats ?? null);
  const activityB = normalizeStoryActivity(userB.engagementStats ?? null);
  const engagementSimilarity = 1 - Math.abs(activityA - activityB);

  const quartileA = getEngagementQuartile(activityA);
  const quartileB = getEngagementQuartile(activityB);

  // High energy pair bonus: both in top quartile AND activity is high energy (>=4)
  let highEnergyPairBonus = 0;
  if (activity !== null && activity.energyLevel >= 4 && quartileA === 4 && quartileB === 4) {
    highEnergyPairBonus = 1;
  }

  // Engagement mismatch penalty: one in bottom quartile, other in top quartile
  let engagementMismatchPenalty = 0;
  if ((quartileA === 1 && quartileB === 4) || (quartileA === 4 && quartileB === 1)) {
    engagementMismatchPenalty = 1;
  }

  return {
    sharedInterestsCount,
    drinkingMatch,
    yearMatch,
    reliabilitySimilarity,
    energyPersonalityMatch,
    blockFlag,
    engagementSimilarity,
    highEnergyPairBonus,
    engagementMismatchPenalty,
  };
}

/**
 * Build a score matrix and run Hungarian algorithm for a set of group-A and
 * group-B participants.
 *
 * Returns an array of [userAId, userBId] pairs (only valid pairings, i.e.
 * assignment[i] !== -1 and score > -Infinity).
 */
export function runSmartPairing(
  groupA: ProfileLike[],
  groupB: ProfileLike[],
  activity: ActivityLike | null,
  blocks: [string, string][],
): { userAId: string; userBId: string; score: number }[] {
  if (groupA.length === 0 || groupB.length === 0) return [];

  const scoreMatrix: number[][] = groupA.map((a) =>
    groupB.map((b) => {
      const features = computeFeatures(a, b, activity, blocks);
      const score = computePairingScore(features);
      // Hungarian expects non-negative scores; -Infinity blocked pairs get 0
      return score === -Infinity ? 0 : Math.max(0, score);
    }),
  );

  const assignment = hungarian(scoreMatrix);

  const results: { userAId: string; userBId: string; score: number }[] = [];
  for (let i = 0; i < groupA.length; i++) {
    const j = assignment[i];
    if (j === undefined || j === -1) continue;
    const a = groupA[i];
    const b = groupB[j];
    if (!a || !b) continue;
    const features = computeFeatures(a, b, activity, blocks);
    const score = computePairingScore(features);
    if (score === -Infinity) continue; // skip blocked pairs
    results.push({ userAId: a.id, userBId: b.id, score });
  }
  return results;
}
