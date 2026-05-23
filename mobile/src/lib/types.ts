export type DrinkingPreference = 'sober' | 'light' | 'flexible' | 'heavy';
export type YearInSchool = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad' | 'other';
export type GroupCategory = 'sports' | 'social' | 'clubs' | 'other';
export type MixerStatus = 'upcoming' | 'locked' | 'live' | 'completed' | 'cancelled';
export type MixerRequestStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'cancelled';
export type PairingMode = 'manual' | 'random' | 'smart';
export type MemberRole = 'member' | 'social_chair' | 'admin';
export type ActivityCategory = 'drinking_game' | 'icebreaker' | 'competition' | 'themed' | 'lowkey';
export type RelationshipStatus = 'single' | 'taken' | 'complicated' | 'prefer_not_to_say';

export interface College {
  id: string;
  name: string;
  state?: string;
  verifiedDomain?: string;
}

export interface Interest {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: string;
  collegeId?: string;
  college?: College;
  yearInSchool?: YearInSchool;
  drinkingPreference: DrinkingPreference;
  relationshipStatus?: RelationshipStatus;
  personalityIndex: number;
  reliabilityScore: number;
  avatarUrl?: string;
  headerUrl?: string;
  bio?: string;
  eduEmail?: string;
  eduVerified?: boolean;
  eduVerifiedAt?: string;
  interests?: { interest: Interest }[];
  groupMemberships?: GroupMember[];
}

export interface Group {
  id: string;
  collegeId: string;
  college?: College;
  name: string;
  description?: string;
  category: GroupCategory;
  coverImageUrl?: string;
  createdById: string;
  inviteCode?: string;
  isVerified: boolean;
  isPrivate?: boolean;
  color?: string;
  avgStarRating?: number;
  totalRatings?: number;
  totalMixers?: number;
  createdAt: string;
  members?: GroupMember[];
  _count?: { members: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user?: Profile;
  group?: Group;
}

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  description: string;
  instructions: string;
  supplies?: string;
  minPeople: number;
  maxPeople: number;
  energyLevel: number;
  alcoholRelated: boolean;
  durationMinutes: number;
}

export interface MixerRequest {
  id: string;
  collegeId: string;
  requestingGroupId: string;
  receivingGroupId: string;
  requestingGroup?: Group;
  receivingGroup?: Group;
  proposedStart: string;
  proposedEnd?: string;
  proposedLocation: string;
  proposedActivityId?: string;
  proposedActivity?: Activity;
  message?: string;
  status: MixerRequestStatus;
  counterStart?: string;
  counterLocation?: string;
  counterActivityId?: string;
  counterActivity?: Activity;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MixerParticipant {
  id: string;
  mixerId: string;
  userId: string;
  groupId: string;
  rsvpStatus: 'going' | 'maybe' | 'not_going';
  checkedIn: boolean;
  user?: Profile;
  group?: Group;
}

export interface Pairing {
  id: string;
  mixerId: string;
  userAId: string;
  userBId: string;
  revealed: boolean;
  userA?: Profile;
  userB?: Profile;
}

export interface Mixer {
  id: string;
  collegeId: string;
  groupAId: string;
  groupBId: string;
  groupA?: Group;
  groupB?: Group;
  scheduledStart: string;
  scheduledEnd?: string;
  location: string;
  activityId?: string;
  activity?: Activity;
  status: MixerStatus;
  pairingMode: PairingMode;
  pairingLocked: boolean;
  liveStartedAt?: string;
  completedAt?: string;
  recapExpiresAt?: string;
  avgRating?: number;
  totalRatings?: number;
  myRating?: number | null;
  createdAt: string;
  participants?: MixerParticipant[];
  pairings?: Pairing[];
}

export interface MixerChangeRequest {
  id: string;
  mixerId: string;
  requestingGroupId: string;
  proposedStart: string;
  proposedEnd?: string;
  proposedLocation: string;
  proposedActivityId?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MixerStory {
  id: string;
  collegeId: string;
  mixerId: string;
  uploaderId: string;
  groupId: string;
  storagePath: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  createdAt: string;
  expiresAt: string;
  isDeleted: boolean;
  uploader?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export interface StoryFeedItem {
  mixerId: string;
  groupAName: string;
  groupBName: string;
  activityName?: string;
  latestCreatedAt: string;
  storyCount: number;
  thumbnailPath: string;
  stories: MixerStory[];
}

export interface PostableMixer {
  mixerId: string;
  groupId: string;
  mixerStatus: MixerStatus;
  scheduledStart: string;
  groupName: string;
  hasPosted: boolean;
}

// Story Reactions
export type ReactionType = 'fire' | 'party' | 'love';

export interface ReactionCounts {
  fire: number;
  party: number;
  love: number;
}

export interface ReactionSummary {
  counts: ReactionCounts;
  total: number;
  userReactions: ReactionType[];
}

// Weekly Mixer Rankings (Top Mixer)
export interface MixerScoreBreakdown {
  storyPosts: number;
  totalReactions: number;
  uniqueReactors: number;
  avgConversationRating: number;
  wouldMixAgainRate: number;
  rawScore: number;
}

export interface WeeklyMixerRanking {
  mixerId: string;
  rank: number;
  score: number;
  breakdown: MixerScoreBreakdown;
  weekStart: string;
  mixer: Mixer;
}

// Group Highlights
export interface GroupHighlightItem {
  id: string;
  highlightId: string;
  storagePath: string;
  sourceStoryId?: string;
  createdAt: string;
  sourceStory?: {
    id: string;
    mediaType: 'image' | 'video';
    width?: number;
    height?: number;
    createdAt: string;
    uploader?: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  };
}

export interface GroupHighlight {
  id: string;
  collegeId: string;
  groupId: string;
  title: string;
  coverStoryItemId?: string;
  createdById: string;
  isDeleted: boolean;
  createdAt: string;
  items?: GroupHighlightItem[];
  coverStory?: {
    storagePath: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

// Campus Heatmap
export type VenueCategory = 'dorm' | 'dining' | 'quad' | 'gym' | 'party' | 'other';

export interface CampusVenue {
  id: string;
  collegeId: string;
  name: string;
  category: VenueCategory;
  lat?: number;
  lon?: number;
  createdAt: string;
}

export interface HeatmapVenue {
  venueId: string;
  venueName: string;
  category: VenueCategory;
  lat?: number;
  lon?: number;
  intensity: number;
  maxContributors: number;
  bucketCount: number;
  normalizedIntensity: number;
}

export interface HeatmapData {
  heatmap: HeatmapVenue[];
  hours: number;
  lastUpdated: string;
  privacyThreshold: number;
}

// ========================================
// V2: MIXER RATINGS
// ========================================

export interface MixerRating {
  id: string;
  mixerId: string;
  raterId: string;
  ratedGroupId: string;
  rating: number; // 0-10 scale
  comment?: string;
  createdAt: string;
  rater?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  ratedGroup?: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
}

export interface MixerRatingsResponse {
  ratings: MixerRating[];
  avgRating: number | null;
  totalRatings: number;
}

export interface GroupStarRating {
  groupId: string;
  name: string;
  starRating: number | null; // 0-5 stars
  totalRatings: number;
}

// ========================================
// V2: MIXER RECAPS (24h after completion)
// ========================================

export interface MixerRecapParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface MixerRecapGroup {
  id: string;
  name: string;
  coverImageUrl?: string;
  avgStarRating?: number;
  participantCount: number;
  participants: MixerRecapParticipant[];
  mixerRating: number | null;
}

export interface MixerRecap {
  mixerId: string;
  completedAt: string;
  recapExpiresAt: string;
  location: string;
  activity?: {
    id: string;
    name: string;
    category: string;
    energyLevel: number;
  };
  groupA: MixerRecapGroup;
  groupB: MixerRecapGroup;
  overallRating: number | null;
  totalRatings: number;
  storyCount: number;
  topStories: {
    id: string;
    storagePath: string;
    mediaType: 'image' | 'video';
    createdAt: string;
  }[];
}

export interface AvailableRecap {
  mixerId: string;
  completedAt: string;
  recapExpiresAt: string;
  location: string;
  groupA: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
  groupB: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
  activity?: {
    id: string;
    name: string;
  };
  storyCount: number;
  ratingCount: number;
  avgRating: number | null;
  myRating: number | null;
}

// ========================================
// MULTI-GROUP MIXER REQUESTS
// ========================================

export type MixerRequestInviteStatus = 'pending' | 'accepted' | 'declined';

export interface MixerRequestInvite {
  id: string;
  requestId: string;
  invitedGroupId: string;
  status: MixerRequestInviteStatus;
  respondedById?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface AlsoInvitedGroup {
  inviteId: string;
  groupId: string;
  groupName: string;
  status: MixerRequestInviteStatus;
}

export interface InboundMixerRequest {
  requestId: string;
  inviteId: string;
  receivingGroupId?: string;
  myStatus: MixerRequestInviteStatus;
  respondedAt?: string;
  requesterGroup: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
  proposedStart: string;
  proposedEnd?: string;
  proposedLocation: string;
  proposedActivity?: {
    id: string;
    name: string;
  };
  message?: string;
  requestStatus: string;
  college?: {
    id: string;
    name: string;
  };
  createdAt: string;
  alsoInvited: AlsoInvitedGroup[];
  totalInvited: number;
}

export interface InvitedGroupStatus {
  inviteId: string;
  groupId: string;
  groupName: string;
  groupCoverImage?: string;
  status: MixerRequestInviteStatus;
  respondedAt?: string;
}

export interface OutboundMixerRequest {
  requestId: string;
  requesterGroup: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
  proposedStart: string;
  proposedEnd?: string;
  proposedLocation: string;
  proposedActivity?: {
    id: string;
    name: string;
  };
  message?: string;
  requestStatus: string;
  college?: {
    id: string;
    name: string;
  };
  createdAt: string;
  invitedGroups: InvitedGroupStatus[];
  acceptedCount: number;
  pendingCount: number;
  declinedCount: number;
}

export interface MixerRequestsForGroup {
  inbound: InboundMixerRequest[];
  outbound: OutboundMixerRequest[];
}

// ========================================
// NOTIFICATIONS & GROUP INVITES
// ========================================

export type NotificationType = 'group_invite' | 'invite_accepted' | 'invite_declined' | 'join_request' | 'general' | 'message_request' | 'message_request_accepted';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: string; // JSON string with additional data
  read: boolean;
  createdAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
  group?: Group;
  inviter?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  invitee?: {
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
  };
}

export interface ProfileSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  yearInSchool?: string;
  college?: {
    id: string;
    name: string;
  };
}

// ========================================
// GLOBAL STORIES (Instagram/Snapchat-like)
// ========================================

export type GlobalStoryReactionType = 'fire' | 'party' | 'love' | 'laugh' | 'wow';

export interface GlobalStory {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  width?: number;
  height?: number;
  expiresAt: string;
  createdAt: string;
  reactionCounts: Record<GlobalStoryReactionType, number>;
  uploader?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface GlobalStoryFeedItem {
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  stories: GlobalStory[];
  latestAt: string;
}

// ========================================
// CHAT ROOMS & MESSAGES
// ========================================

export interface ChatRoom {
  id: string;
  type: 'group' | 'mixer' | 'openMixer';
  name: string;
  coverImageUrl?: string | null;
  lastMessageAt?: string | null;
  lastMessage?: { text: string; senderName: string } | null;
  unreadCount: number;
  mixerId?: string;
  groupId?: string;
  openMixerId?: string;
  otherGroupName?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  messageType: 'text' | 'change_request';
  changeRequestId?: string | null;
  changeRequest?: {
    id: string;
    mixerId: string;
    requestingGroupId: string;
    proposedStart: string;
    proposedEnd?: string | null;
    proposedLocation: string;
    proposedActivityId?: string | null;
    message?: string | null;
    status: string;
    createdById: string;
    mixer?: {
      groupA: { id: string; name: string };
      groupB: { id: string; name: string };
    };
  } | null;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

// ========================================
// PAIRING REQUESTS (User requests, Admin decides)
// ========================================

export type PairingRequestStatus = 'pending' | 'approved' | 'declined' | 'expired';

export interface PairingRequest {
  id: string;
  mixerId: string;
  requesterId: string;
  targetId: string;
  message?: string;
  status: PairingRequestStatus;
  decidedById?: string;
  decidedAt?: string;
  createdAt: string;
  requester?: {
    id: string;
    name: string;
    avatarUrl?: string;
    yearInSchool?: string;
  };
  target?: {
    id: string;
    name: string;
    avatarUrl?: string;
    yearInSchool?: string;
  };
  decidedBy?: {
    id: string;
    name: string;
  };
}

// ── Open Mixers (public, group-agnostic events) ──────────────────────────────

export type OpenMixerStatus = 'open' | 'full' | 'live' | 'completed' | 'cancelled';

export interface OpenMixerParticipant {
  id: string;
  openMixerId: string;
  userId: string;
  rsvpStatus: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
    collegeId?: string;
    yearInSchool?: string;
  };
}

export interface OpenMixerPairing {
  id: string;
  openMixerId: string;
  userAId: string;
  userBId: string;
  revealed: boolean;
  createdAt: string;
  userA?: { id: string; name: string; avatarUrl?: string };
  userB?: { id: string; name: string; avatarUrl?: string };
}

export interface OpenMixer {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  backgroundImage?: string; // key like 'poker', 'party', 'sports', etc.
  activityId?: string;
  activity?: Activity;
  hostId: string;
  host?: {
    id: string;
    name: string;
    avatarUrl?: string;
    collegeId?: string;
    yearInSchool?: string;
  };
  location: string;
  scheduledStart: string;
  scheduledEnd?: string;
  maxCapacity: number;
  status: OpenMixerStatus;
  pairingMode: string;
  pairingLocked: boolean;
  liveStartedAt?: string;
  completedAt?: string;
  createdAt: string;
  participants?: OpenMixerParticipant[];
  pairings?: OpenMixerPairing[];
  isParticipant?: boolean;
  _count?: { participants: number };
}

// ========================================
// DIRECT MESSAGES (1:1 messaging with requests)
// ========================================

export type DirectConversationStatus = 'pending' | 'accepted' | 'declined';

export interface DirectConversation {
  id: string;
  status: DirectConversationStatus;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  } | null;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

