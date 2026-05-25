import type {
  College,
  Interest,
  Activity,
  Profile,
  Group,
  GroupMember,
  GroupCategory,
  MixerRequest,
  Mixer,
  MixerParticipant,
  Pairing,
  MixerStatus,
  PairingMode,
  MemberRole,
  DrinkingPreference,
  YearInSchool,
  ActivityCategory,
  MixerStory,
  StoryFeedItem,
  PostableMixer,
  ReactionType,
  ReactionSummary,
  WeeklyMixerRanking,
  GroupHighlight,
  GroupHighlightItem,
  CampusVenue,
  HeatmapData,
  VenueCategory,
  RelationshipStatus,
  MixerRating,
  MixerRatingsResponse,
  GroupStarRating,
  MixerRecap,
  AvailableRecap,
  MixerRequestsForGroup,
  MixerRequestInviteStatus,
  Notification,
  GroupInvite,
  MixerChangeRequest,
  ProfileSearchResult,
  GlobalStory,
  GlobalStoryFeedItem,
  GlobalStoryReactionType,
  PairingRequest,
  ChatRoom,
  ChatMessage,
  OpenMixer,
  OpenMixerParticipant,
  OpenMixerPairing,
  OpenMixerStatus,
  DirectConversation,
  DirectMessage,
} from './types';

export type {
  College,
  Interest,
  Activity,
  Profile,
  Group,
  GroupMember,
  GroupCategory,
  MixerRequest,
  Mixer,
  MixerParticipant,
  Pairing,
  MixerStatus,
  PairingMode,
  MemberRole,
  DrinkingPreference,
  YearInSchool,
  ActivityCategory,
  MixerStory,
  StoryFeedItem,
  PostableMixer,
  ReactionType,
  ReactionSummary,
  WeeklyMixerRanking,
  GroupHighlight,
  GroupHighlightItem,
  CampusVenue,
  HeatmapData,
  VenueCategory,
  RelationshipStatus,
  MixerRating,
  MixerRatingsResponse,
  GroupStarRating,
  MixerRecap,
  AvailableRecap,
  MixerRequestsForGroup,
  Notification,
  GroupInvite,
  ProfileSearchResult,
  ChatRoom,
  ChatMessage,
  OpenMixer,
  OpenMixerParticipant,
  OpenMixerPairing,
  OpenMixerStatus,
  DirectConversation,
  DirectMessage,
};

export interface GroupLeaderboardEntry {
  groupId: string;
  name: string;
  coverImageUrl: string | null;
  category: string;
  memberCount: number;
  avgStarRating: number | null;
  mixerCount: number;
  score: number;
  rank: number;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  user?: Profile;
}

export type VoteOption = { id: string; name: string; subtitle: string; emoji: string; votes: number };
export type MixerVotesKindResponse = { options: VoteOption[]; totalVotes: number; myVote: string | null };
export type MixerVotesResponse = { theme: MixerVotesKindResponse; activity: MixerVotesKindResponse };

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  colleges: {
    list: () => request<{ colleges: College[] }>('/api/colleges').then((r) => r.colleges),
  },
  interests: {
    list: () => request<{ interests: Interest[] }>('/api/interests').then((r) => r.interests),
    create: (name: string) =>
      request<{ interest: Interest }>('/api/interests', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }).then((r) => r.interest),
  },
  activities: {
    list: (category?: string) =>
      request<{ activities: Activity[] }>(`/api/activities${category ? `?category=${category}` : ''}`).then((r) => r.activities),
    trending: () =>
      request<{ activities: Activity[] }>(`/api/activities/trending`).then((r) => r.activities),
    get: (id: string) => request<{ activity: Activity }>(`/api/activities/${id}`).then((r) => r.activity),
  },
  profiles: {
    create: (data: Partial<Profile> & { email: string; name: string }) =>
      request<{ profile: Profile }>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.profile),
    get: (id: string) => request<{ profile: Profile }>(`/api/profiles/${id}`).then((r) => r.profile),
    getByEmail: (email: string) =>
      request<{ profile: Profile }>(`/api/profiles/by-email/${encodeURIComponent(email)}`).then((r) => r.profile),
    update: (id: string, data: Partial<Profile>) =>
      request<{ profile: Profile }>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((r) => r.profile),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' }),
    setInterests: (id: string, interestIds: string[]) =>
      request<void>(`/api/profiles/${id}/interests`, {
        method: 'POST',
        body: JSON.stringify({ interestIds }),
      }),
  },
  groups: {
    list: (params?: { collegeId?: string; collegeIds?: string[]; category?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.collegeIds && params.collegeIds.length > 0) q.set('collegeIds', params.collegeIds.join(','));
      else if (params?.collegeId) q.set('collegeId', params.collegeId);
      if (params?.category) q.set('category', params.category);
      if (params?.search) q.set('search', params.search);
      return request<{ groups: Group[] }>(`/api/groups?${q.toString()}`).then((r) => r.groups);
    },
    getTop: (params?: { collegeId?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.collegeId) q.set('collegeId', params.collegeId);
      if (params?.limit) q.set('limit', params.limit.toString());
      return request<{ groups: (Group & { mixerCount: number })[] }>(`/api/groups/top?${q.toString()}`).then((r) => r.groups);
    },
    get: (id: string) => request<{ group: Group }>(`/api/groups/${id}`).then((r) => r.group),
    create: (data: {
      collegeId: string;
      name: string;
      description?: string;
      category: string;
      coverImageUrl?: string;
      createdById: string;
      isPrivate?: boolean;
      color?: string;
    }) => request<Group>('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Group> & { requesterId: string }) =>
      request<Group>(`/api/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    join: (id: string, userId: string) =>
      request<GroupMember>(`/api/groups/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    leave: (id: string, userId: string) =>
      request<void>(`/api/groups/${id}/leave`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    getJoinRequests: (id: string) =>
      request<{ requests: GroupJoinRequest[] }>(`/api/groups/${id}/join-requests`).then((r) => r.requests),
    getMyJoinRequest: (id: string, userId: string) =>
      request<{ hasPendingRequest: boolean; request: GroupJoinRequest | null }>(`/api/groups/${id}/join-requests/my?userId=${userId}`),
    requestJoin: (id: string, userId: string) =>
      request<void>(`/api/groups/${id}/join-requests`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    respondToJoinRequest: (groupId: string, requestId: string, status: 'approved' | 'declined', decidedById: string) =>
      request<{ request: GroupJoinRequest }>(`/api/groups/${groupId}/join-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, decidedById }),
      }),
    updateMemberRole: (groupId: string, userId: string, role: MemberRole, requesterId: string) =>
      request<void>(`/api/groups/${groupId}/members/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role, requesterId }),
      }),
    removeMember: (groupId: string, userId: string, requesterId: string) =>
      request<void>(`/api/groups/${groupId}/members/${userId}?requesterId=${requesterId}`, { method: 'DELETE' }),
    joinByCode: (code: string, userId: string) =>
      request<{ group: Group; member: GroupMember }>('/api/groups/join-by-code', {
        method: 'POST',
        body: JSON.stringify({ code, userId }),
      }),
  },
  mixerRequests: {
    list: (groupId: string) =>
      request<MixerRequest[]>(`/api/mixer-requests?groupId=${groupId}`),
    // New: Get requests for group with "also invited" info
    getForGroup: (groupId: string) =>
      request<MixerRequestsForGroup>(`/api/mixer-requests/for-group/${groupId}`),
    create: (data: {
      collegeId: string;
      requestingGroupId: string;
      receivingGroupId: string;
      proposedStart: string;
      proposedLocation: string;
      proposedActivityId?: string;
      surpriseActivity?: boolean;
      isOpenMixer?: boolean;
      message?: string;
      createdById: string;
    }) =>
      request<{ request: MixerRequest }>('/api/mixer-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.request),
    // New: Create multi-group mixer request
    createMulti: (data: {
      collegeId: string;
      requestingGroupId: string;
      invitedGroupIds: string[];
      proposedStart: string;
      proposedEnd?: string;
      proposedLocation: string;
      proposedActivityId?: string;
      message?: string;
      createdById: string;
    }) =>
      request<{
        request: MixerRequest;
        invites: Array<{ id: string; invitedGroupId: string; status: string }>;
        invitedGroups: Array<{ id: string; name: string }>;
      }>('/api/mixer-requests/multi', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    respond: (
      id: string,
      data: {
        action: 'accept' | 'decline' | 'counter';
        responderId: string;
        counterStart?: string;
        counterLocation?: string;
        counterActivityId?: string;
      }
    ) =>
      request<{ request: MixerRequest; mixer?: Mixer }>(`/api/mixer-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    // New: Respond to a specific invite
    respondToInvite: (
      inviteId: string,
      data: { responderId: string; response: 'accepted' | 'declined' }
    ) =>
      request<{
        invite: { id: string; status: string; respondedAt: string };
        mixer: Mixer | null;
        request: MixerRequest | null;
      }>(`/api/mixer-requests/invite/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string) =>
      request<void>(`/api/mixer-requests/${id}`, { method: 'DELETE' }),
    dismiss: (id: string) =>
      request<{ success: boolean }>(`/api/mixer-requests/${id}/dismiss`, { method: 'POST' }),
  },
  mixers: {
    list: (params: { groupId?: string; collegeId?: string }) => {
      const q = new URLSearchParams();
      if (params.groupId) q.set('groupId', params.groupId);
      if (params.collegeId) q.set('collegeId', params.collegeId);
      return request<{ mixers: Mixer[] }>(`/api/mixers?${q.toString()}`).then((r) => r.mixers);
    },
    get: (id: string, userId?: string) => request<{ mixer: Mixer }>(`/api/mixers/${id}${userId ? `?userId=${userId}` : ''}`).then((r) => r.mixer),
    setStatus: (id: string, status: MixerStatus, requesterId: string) =>
      request<Mixer>(`/api/mixers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, requesterId }),
      }),
    setPairingMode: (id: string, mode: PairingMode) =>
      request<Mixer>(`/api/mixers/${id}/pairing-mode`, {
        method: 'PUT',
        body: JSON.stringify({ mode }),
      }),
    addParticipant: (
      id: string,
      data: { userId: string; groupId: string; rsvpStatus?: string }
    ) =>
      request<MixerParticipant>(`/api/mixers/${id}/participants`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateRsvp: (id: string, userId: string, rsvpStatus: string) =>
      request<void>(`/api/mixers/${id}/participants/${userId}/rsvp`, {
        method: 'PUT',
        body: JSON.stringify({ rsvpStatus }),
      }),
    checkIn: (id: string, userId: string) =>
      request<void>(`/api/mixers/${id}/participants/${userId}/checkin`, {
        method: 'PUT',
      }),
    generatePairings: (id: string, mode: 'random' | 'smart') =>
      request<Pairing[]>(`/api/mixers/${id}/generate-pairings`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }),
    savePairings: (id: string, pairings: { userAId: string; userBId: string }[]) =>
      request<Pairing[]>(`/api/mixers/${id}/pairings`, {
        method: 'PUT',
        body: JSON.stringify({ pairings }),
      }),
    submitFeedback: (
      id: string,
      data: {
        userId: string;
        conversationRating?: number;
        activityRating?: number;
        wouldMixAgain?: boolean;
        notes?: string;
      }
    ) =>
      request<void>(`/api/mixers/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createChangeRequest: (
      id: string,
      data: {
        requestingGroupId: string;
        proposedStart: string;
        proposedEnd?: string;
        proposedLocation: string;
        proposedActivityId?: string;
        message?: string;
        createdById: string;
      }
    ) =>
      request<{ changeRequest: MixerChangeRequest }>(`/api/mixers/${id}/change-requests`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getChangeRequests: (id: string) =>
      request<{ changeRequests: MixerChangeRequest[] }>(`/api/mixers/${id}/change-requests`).then(
        (r) => r.changeRequests
      ),
    respondToChangeRequest: (
      mixerId: string,
      crId: string,
      data: { response: 'accepted' | 'declined'; responderId: string }
    ) =>
      request<{ changeRequest: MixerChangeRequest }>(
        `/api/mixers/${mixerId}/change-requests/${crId}/respond`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
  },
  clusters: {
    setSize: (mixerId: string, size: number, requesterId: string) =>
      request<{ mixer: Mixer }>(`/api/mixers/${mixerId}/cluster-size`, {
        method: 'PUT',
        body: JSON.stringify({ size, requesterId }),
      }).then((r) => r.mixer),
    generate: (mixerId: string, requesterId: string) =>
      request<{ clusters: Array<{ clusterId: string; userIds: string[] }> }>(
        `/api/mixers/${mixerId}/generate-clusters`,
        { method: 'POST', body: JSON.stringify({ requesterId }) }
      ).then((r) => r.clusters),
    myCluster: (mixerId: string, userId: string) =>
      request<{
        cluster: {
          id: string;
          name: string | null;
          members: { userId: string; groupId: string; profile: { id: string; name: string; avatarUrl?: string; collegeId?: string } | null }[];
        } | null;
      }>(`/api/mixers/${mixerId}/my-cluster?userId=${encodeURIComponent(userId)}`)
        .then((r) => r.cluster),
    list: (mixerId: string) =>
      request<{
        clusters: {
          id: string;
          name: string | null;
          members: { id: string; userId: string; groupId: string; profile: { id: string; name: string; avatarUrl?: string } | null }[];
        }[];
      }>(`/api/mixers/${mixerId}/clusters`).then((r) => r.clusters),
    moveMember: (mixerId: string, userId: string, targetClusterId: string, requesterId: string) =>
      request<{ ok: boolean }>(`/api/mixers/${mixerId}/clusters/move`, {
        method: 'PUT',
        body: JSON.stringify({ userId, targetClusterId, requesterId }),
      }),
  },
  mixerVotes: {
    get: (mixerId: string, userId?: string) =>
      request<MixerVotesResponse>(
        `/api/mixer-votes/${mixerId}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`
      ),
    cast: (mixerId: string, payload: { userId: string; kind: 'theme' | 'activity'; optionId: string }) =>
      request<{ vote: { id: string; mixerId: string; userId: string; kind: string; optionId: string } }>(
        `/api/mixer-votes/${mixerId}`,
        { method: 'POST', body: JSON.stringify(payload) }
      ),
    remove: (mixerId: string, userId: string, kind: 'theme' | 'activity') =>
      request<{ ok: true }>(
        `/api/mixer-votes/${mixerId}?userId=${encodeURIComponent(userId)}&kind=${kind}`,
        { method: 'DELETE' }
      ),
  },
  safety: {
    block: (blockerId: string, blockedId: string) =>
      request<void>('/api/safety/block', {
        method: 'POST',
        body: JSON.stringify({ blockerId, blockedId }),
      }),
    unblock: (blockerId: string, blockedId: string) =>
      request<void>('/api/safety/block', {
        method: 'DELETE',
        body: JSON.stringify({ blockerId, blockedId }),
      }),
    report: (data: {
      reporterId: string;
      reportedUserId?: string;
      reason: string;
      details?: string;
    }) =>
      request<void>('/api/safety/report', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  stories: {
    getFeed: (collegeId: string, userId?: string) =>
      request<{ feed: StoryFeedItem[] }>(
        `/api/stories/feed?collegeId=${collegeId}${userId ? `&userId=${userId}` : ''}`
      ).then((r) => r.feed),
    getMixerStories: (mixerId: string, userId?: string) =>
      request<{ stories: MixerStory[] }>(
        `/api/stories/mixer/${mixerId}${userId ? `?userId=${userId}` : ''}`
      ).then((r) => r.stories),
    upload: async (data: {
      file: { uri: string; type: string; name: string };
      mixerId: string;
      uploaderId: string;
      groupId: string;
      width?: number;
      height?: number;
      caption?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', {
        uri: data.file.uri,
        type: data.file.type,
        name: data.file.name,
      } as unknown as Blob);
      formData.append('mixerId', data.mixerId);
      formData.append('uploaderId', data.uploaderId);
      formData.append('groupId', data.groupId);
      if (data.width) formData.append('width', String(data.width));
      if (data.height) formData.append('height', String(data.height));
      if (data.caption) formData.append('caption', data.caption);

      const res = await fetch(`${BASE_URL}/api/stories/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }
      return (await res.json()) as { story: MixerStory };
    },
    delete: (storyId: string, userId: string) =>
      request<{ success: boolean }>(`/api/stories/${storyId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }),
    canPost: (userId: string) =>
      request<{ canPost: boolean; postableMixers: PostableMixer[] }>(
        `/api/stories/can-post?userId=${userId}`
      ),
    getFileUrl: (storagePath: string) => {
      const filename = storagePath.split('/').pop();
      return `${BASE_URL}/api/stories/file/${filename}`;
    },
  },
  reactions: {
    toggle: (storyId: string, reactorId: string, reaction: ReactionType) =>
      request<{ action: 'added' | 'removed'; reaction: ReactionType; id?: string }>(
        '/api/reactions/toggle',
        {
          method: 'POST',
          body: JSON.stringify({ storyId, reactorId, reaction }),
        }
      ),
    getSummary: (storyId: string, userId?: string) =>
      request<ReactionSummary>(
        `/api/reactions/summary/${storyId}${userId ? `?userId=${userId}` : ''}`
      ),
    getMixerReactions: (mixerId: string, userId?: string) =>
      request<{
        summaryByStory: Record<string, { counts: Record<string, number>; userReactions: string[] }>;
      }>(`/api/reactions/mixer/${mixerId}${userId ? `?userId=${userId}` : ''}`),
  },
  rankings: {
    computeWeekly: (collegeId?: string) =>
      request<{ success: boolean; results: unknown[]; weekStart: string }>(
        `/api/rankings/compute${collegeId ? `?collegeId=${collegeId}` : ''}`,
        { method: 'POST' }
      ),
    getTop: (collegeId: string) =>
      request<{ topMixer: WeeklyMixerRanking | null }>(`/api/rankings/top?collegeId=${collegeId}`),
    getLeaderboard: (collegeId: string, limit = 10) =>
      request<{ weekStart: string; leaderboard: WeeklyMixerRanking[] }>(
        `/api/rankings/leaderboard?collegeId=${collegeId}&limit=${limit}`
      ),
    getGroupsLeaderboard: (collegeId: string) =>
      request<{ leaderboard: GroupLeaderboardEntry[] }>(
        `/api/rankings/groups-leaderboard?collegeId=${collegeId}`
      ),
  },
  highlights: {
    getForGroup: (groupId: string) =>
      request<{ highlights: GroupHighlight[] }>(`/api/highlights/group/${groupId}`).then(
        (r) => r.highlights
      ),
    get: (highlightId: string) =>
      request<{ highlight: GroupHighlight }>(`/api/highlights/${highlightId}`).then(
        (r) => r.highlight
      ),
    create: (data: {
      userId: string;
      groupId: string;
      mixerId: string;
      title: string;
      storyIds: string[];
    }) =>
      request<{ highlight: GroupHighlight }>('/api/highlights/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.highlight),
    update: (highlightId: string, userId: string, title: string) =>
      request<{ highlight: GroupHighlight }>(`/api/highlights/${highlightId}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId, title }),
      }).then((r) => r.highlight),
    delete: (highlightId: string, userId: string) =>
      request<{ success: boolean }>(`/api/highlights/${highlightId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }),
    getMixersForGroup: (groupId: string) =>
      request<{
        mixers: {
          id: string;
          groupA: { id: string; name: string };
          groupB: { id: string; name: string };
          activity: { id: string; name: string } | null;
          scheduledStart: string;
          status: MixerStatus;
          storyCount: number;
        }[];
      }>(`/api/highlights/mixers/${groupId}`).then((r) => r.mixers),
    getStoriesForMixer: (mixerId: string) =>
      request<{
        stories: {
          id: string;
          storagePath: string;
          mediaType: 'image' | 'video';
          width?: number;
          height?: number;
          createdAt: string;
          uploader?: { id: string; name: string; avatarUrl?: string };
          group?: { id: string; name: string };
        }[];
      }>(`/api/highlights/stories/${mixerId}`).then((r) => r.stories),
    getFileUrl: (storagePath: string) => {
      const filename = storagePath.split('/').pop();
      return `${BASE_URL}/api/highlights/file/${filename}`;
    },
  },
  heatmap: {
    getVenues: (collegeId: string) =>
      request<{ venues: CampusVenue[] }>(`/api/heatmap/venues?collegeId=${collegeId}`).then(
        (r) => r.venues
      ),
    createVenue: (data: {
      collegeId: string;
      name: string;
      category: VenueCategory;
      lat?: number;
      lon?: number;
    }) =>
      request<{ venue: CampusVenue }>('/api/heatmap/venues', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.venue),
    submitVibe: (userId: string, venueId: string, mixerId?: string) =>
      request<{ success: boolean; contributorCount: number }>('/api/heatmap/submit', {
        method: 'POST',
        body: JSON.stringify({ userId, venueId, mixerId }),
      }),
    getHeatmap: (collegeId: string, hours = 6) =>
      request<HeatmapData>(`/api/heatmap/heatmap?collegeId=${collegeId}&hours=${hours}`),
    canSubmit: (userId: string) =>
      request<{ canSubmit: boolean }>(`/api/heatmap/can-submit?userId=${userId}`),
    seedVenues: (collegeId: string) =>
      request<{ created: number; venues: CampusVenue[] }>(
        `/api/heatmap/seed-venues?collegeId=${collegeId}`,
        { method: 'POST' }
      ),
  },
  // V2: Mixer Ratings
  ratings: {
    submit: (data: {
      mixerId: string;
      raterId: string;
      ratedGroupId: string;
      rating: number;
      comment?: string;
      tags?: string[];
    }) =>
      request<{ rating: MixerRating }>('/api/ratings/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.rating),
    getMixerRatings: (mixerId: string) =>
      request<MixerRatingsResponse>(`/api/ratings/mixer/${mixerId}`),
    getGroupRating: (groupId: string) =>
      request<GroupStarRating>(`/api/ratings/group/${groupId}`),
    getUserRating: (mixerId: string, userId: string) =>
      request<{ ratings: MixerRating[] }>(
        `/api/ratings/user-rating?mixerId=${mixerId}&userId=${userId}`
      ).then((r) => r.ratings),
  },
  // V2: Mixer Recaps
  recaps: {
    getRecap: (mixerId: string) =>
      request<{ recap: MixerRecap }>(`/api/recaps/${mixerId}`).then((r) => r.recap),
    getAvailable: (userId: string) =>
      request<{ recaps: AvailableRecap[] }>(`/api/recaps/available/${userId}`).then(
        (r) => r.recaps
      ),
    setExpiration: (mixerId: string) =>
      request<{ success: boolean; recapExpiresAt: string }>(
        `/api/recaps/set-expiration/${mixerId}`,
        { method: 'POST' }
      ),
  },
  // AI Features (Grok 4)
  ai: {
    chat: (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: { max_tokens?: number; temperature?: number }) =>
      request<{ choices: Array<{ message?: { content?: string } }> }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, ...options }),
      }),
    getIcebreakers: (user1Interests: string[], user2Interests: string[], mixerTopic?: string) =>
      request<{ icebreakers: string[] }>('/api/ai/icebreakers', {
        method: 'POST',
        body: JSON.stringify({ user1Interests, user2Interests, mixerTopic }),
      }).then((r) => r.icebreakers),
    getPairingSuggestions: (
      userInterests: string[],
      potentialMatches: Array<{ id: string; name: string; interests: string[]; bio?: string }>,
      userBio?: string
    ) =>
      request<{
        rankings?: Array<{ id: string; score: number; reason: string }>;
        topPick?: string;
        suggestedTopic?: string;
        suggestion?: string;
      }>('/api/ai/pairing-suggestions', {
        method: 'POST',
        body: JSON.stringify({ userInterests, potentialMatches, userBio }),
      }),
    summarizeMixer: (data: {
      mixerName?: string;
      groupNames?: string[];
      participantCount?: number;
      durationMinutes?: number;
      avgRating?: number;
      highlights?: string;
    }) =>
      request<{ summary: string }>('/api/ai/summarize-mixer', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.summary),
  },
  // EDU Email Verification
  eduVerification: {
    sendCode: (userId: string, eduEmail: string) =>
      request<{ success: boolean; message: string; expiresAt: string; devCode?: string }>(
        '/api/edu-verification/send',
        { method: 'POST', body: JSON.stringify({ userId, eduEmail }) }
      ),
    confirmCode: (userId: string, code: string) =>
      request<{ success: boolean; message: string; eduEmail: string; verifiedAt: string }>(
        '/api/edu-verification/confirm',
        { method: 'POST', body: JSON.stringify({ userId, code }) }
      ),
    getStatus: (userId: string) =>
      request<{
        eduEmail: string | null;
        isVerified: boolean;
        verifiedAt: string | null;
        pending: { email: string; expiresAt: string; attemptsRemaining: number } | null;
      }>(`/api/edu-verification/status/${userId}`),
  },
  // Profile Media (Avatar/Header uploads)
  profileMedia: {
    uploadAvatar: async (userId: string, file: { uri: string; type: string; name: string }) => {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as unknown as Blob);
      formData.append('userId', userId);

      const res = await fetch(`${BASE_URL}/api/profile-media/upload-avatar`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }
      return (await res.json()) as { success: boolean; avatarUrl: string; profile: Profile };
    },
    uploadHeader: async (userId: string, file: { uri: string; type: string; name: string }) => {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as unknown as Blob);
      formData.append('userId', userId);

      const res = await fetch(`${BASE_URL}/api/profile-media/upload-header`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }
      return (await res.json()) as { success: boolean; headerUrl: string; profile: Profile };
    },
    removeAvatar: (userId: string) =>
      request<{ success: boolean }>(`/api/profile-media/avatar/${userId}`, { method: 'DELETE' }),
    removeHeader: (userId: string) =>
      request<{ success: boolean }>(`/api/profile-media/header/${userId}`, { method: 'DELETE' }),
    getFileUrl: (storagePath: string) => {
      const filename = storagePath.split('/').pop();
      return `${BASE_URL}/api/profile-media/file/${filename}`;
    },
  },
  // Notifications
  notifications: {
    list: (userId: string, options?: { unreadOnly?: boolean; limit?: number }) => {
      const q = new URLSearchParams({ userId });
      if (options?.unreadOnly) q.set('unreadOnly', 'true');
      if (options?.limit) q.set('limit', options.limit.toString());
      return request<{ notifications: Notification[] }>(`/api/notifications?${q.toString()}`).then(
        (r) => r.notifications
      );
    },
    getUnreadCount: (userId: string) =>
      request<{ count: number }>(`/api/notifications/unread-count?userId=${userId}`).then(
        (r) => r.count
      ),
    markRead: (userId: string, options?: { notificationIds?: string[]; markAllRead?: boolean }) =>
      request<{ success: boolean }>('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ userId, ...options }),
      }),
    delete: (id: string, userId: string) =>
      request<{ success: boolean }>(`/api/notifications/${id}?userId=${userId}`, {
        method: 'DELETE',
      }),
  },
  // Group Invites
  invites: {
    getPending: (userId: string) =>
      request<{ invites: GroupInvite[] }>(`/api/invites/pending?userId=${userId}`).then(
        (r) => r.invites
      ),
    getSent: (groupId: string, inviterId?: string) => {
      const q = new URLSearchParams({ groupId });
      if (inviterId) q.set('inviterId', inviterId);
      return request<{ invites: GroupInvite[] }>(`/api/invites/sent?${q.toString()}`).then(
        (r) => r.invites
      );
    },
    send: (groupId: string, inviterId: string, inviteeId: string) =>
      request<{ invite: GroupInvite }>('/api/invites/send', {
        method: 'POST',
        body: JSON.stringify({ groupId, inviterId, inviteeId }),
      }).then((r) => r.invite),
    respond: (inviteId: string, userId: string, response: 'accepted' | 'declined') =>
      request<{ invite: GroupInvite }>('/api/invites/respond', {
        method: 'POST',
        body: JSON.stringify({ inviteId, userId, response }),
      }).then((r) => r.invite),
    cancel: (inviteId: string, requesterId: string) =>
      request<{ success: boolean }>(`/api/invites/${inviteId}?requesterId=${requesterId}`, {
        method: 'DELETE',
      }),
  },
  // Profile Search (for invites)
  profileSearch: (query: string, options?: { collegeId?: string; excludeGroupId?: string; limit?: number }) => {
    const q = new URLSearchParams({ q: query });
    if (options?.collegeId) q.set('collegeId', options.collegeId);
    if (options?.excludeGroupId) q.set('excludeGroupId', options.excludeGroupId);
    if (options?.limit) q.set('limit', options.limit.toString());
    return request<{ profiles: ProfileSearchResult[] }>(`/api/profiles/search?${q.toString()}`).then(
      (r) => r.profiles
    );
  },
  // Global Stories (Instagram/Snapchat-like)
  globalStories: {
    getFeed: async (collegeId: string, userId?: string, limit?: number, cursor?: string) => {
      const q = new URLSearchParams({ collegeId });
      if (userId) q.set('userId', userId);
      if (limit) q.set('limit', limit.toString());
      if (cursor) q.set('cursor', cursor);
      const result = await request<{
        feed: GlobalStoryFeedItem[];
        nextCursor: string | null;
      }>(`/api/global-stories/feed?${q.toString()}`);
      // Transform relative mediaUrls to absolute URLs
      return {
        ...result,
        feed: result.feed.map((item) => ({
          ...item,
          stories: item.stories.map((story) => ({
            ...story,
            mediaUrl: story.mediaUrl.startsWith('http')
              ? story.mediaUrl
              : `${BASE_URL}${story.mediaUrl}`,
          })),
        })),
      };
    },
    upload: async (data: {
      collegeId: string;
      uploaderId: string;
      file: { uri: string; type: string; name: string };
      caption?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', {
        uri: data.file.uri,
        type: data.file.type,
        name: data.file.name,
      } as unknown as Blob);
      formData.append('uploaderId', data.uploaderId);
      formData.append('collegeId', data.collegeId);
      if (data.caption) formData.append('caption', data.caption);

      const res = await fetch(`${BASE_URL}/api/global-stories`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }
      return (await res.json()) as { story: GlobalStory };
    },
    delete: (storyId: string, userId: string) =>
      request<{ success: boolean }>(`/api/global-stories/${storyId}?userId=${userId}`, {
        method: 'DELETE',
      }),
    react: (storyId: string, reactorId: string, reaction: GlobalStoryReactionType) =>
      request<{ action: 'added' | 'removed'; reaction: string }>(
        `/api/global-stories/${storyId}/react`,
        {
          method: 'POST',
          body: JSON.stringify({ reactorId, reaction }),
        }
      ),
    getMy: (userId: string) =>
      request<{ stories: GlobalStory[] }>(`/api/global-stories/my?userId=${userId}`).then(
        (r) => r.stories
      ),
    getUser: async (targetUserId: string, viewerId?: string) => {
      const q = new URLSearchParams();
      if (viewerId) q.set('viewerId', viewerId);
      const result = await request<{ user: { id: string; name: string; avatarUrl: string | null } | null; stories: GlobalStory[] }>(
        `/api/global-stories/user/${targetUserId}?${q.toString()}`
      );
      // Transform relative mediaUrls to absolute URLs
      return {
        ...result,
        stories: result.stories.map((story) => ({
          ...story,
          mediaUrl: story.mediaUrl.startsWith('http')
            ? story.mediaUrl
            : `${BASE_URL}${story.mediaUrl}`,
        })),
      };
    },
  },
  // Pairing Requests (User requests, Admin decides)
  pairingRequests: {
    create: (data: {
      mixerId: string;
      requesterId: string;
      targetId: string;
      message?: string;
    }) =>
      request<{ request: PairingRequest }>('/api/pairing-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.request),
    getMixerRequests: (mixerId: string, adminId: string) =>
      request<{
        requests: PairingRequest[];
        stats: {
          total: number;
          pending: number;
          approved: number;
          declined: number;
          mutualPairs: Array<{ userA: string; userB: string }>;
          mostRequested: Array<{ userId: string; count: number }>;
        };
      }>(`/api/pairing-requests/mixer/${mixerId}?userId=${adminId}`),
    getMy: (mixerId: string, userId: string) =>
      request<{ requests: PairingRequest[] }>(
        `/api/pairing-requests/my?mixerId=${mixerId}&userId=${userId}`
      ).then((r) => r.requests),
    decide: (requestId: string, adminId: string, decision: 'approved' | 'declined') =>
      request<{ request: PairingRequest }>(`/api/pairing-requests/${requestId}/decide`, {
        method: 'PUT',
        body: JSON.stringify({ adminId, decision }),
      }).then((r) => r.request),
    cancel: (requestId: string, userId: string) =>
      request<{ success: boolean }>(`/api/pairing-requests/${requestId}?userId=${userId}`, {
        method: 'DELETE',
      }),
    finalize: (mixerId: string, adminId: string, pairings: Array<{ userAId: string; userBId: string }>) =>
      request<{ pairings: Pairing[]; message: string }>(
        `/api/pairing-requests/mixer/${mixerId}/finalize`,
        {
          method: 'POST',
          body: JSON.stringify({ adminId, pairings }),
        }
      ),
    getSuggestions: (mixerId: string, adminId: string) =>
      request<{
        mutualPairs: Array<{
          userA: { id: string; name: string; avatarUrl: string | null };
          userB: { id: string; name: string; avatarUrl: string | null };
          confidence: 'mutual' | 'one-way';
        }>;
        requests: PairingRequest[];
        participants: Array<{
          id: string;
          name: string;
          avatarUrl: string | null;
          groupId: string;
          groupName: string;
        }>;
      }>(`/api/pairing-requests/mixer/${mixerId}/suggestions?userId=${adminId}`),
  },
  // Chat Rooms & Messages
  chat: {
    getRooms: (userId: string) =>
      request<{ rooms: ChatRoom[] }>(`/api/chat/rooms?userId=${userId}`).then((r) => r.rooms),
    getOpenMixerRoom: (openMixerId: string, userId: string) =>
      request<{ room: { id: string; name: string; isOpen: boolean } }>(
        `/api/chat/open-mixer-room?openMixerId=${openMixerId}&userId=${userId}`
      ).then((r) => r.room),
    closeOpenMixerRoom: (openMixerId: string) =>
      request<{ success: boolean }>(`/api/chat/open-mixer-room/${openMixerId}/close`, { method: 'POST' }),
    getMessages: (roomId: string, userId: string, options?: { limit?: number; before?: string }) => {
      const q = new URLSearchParams({ userId });
      if (options?.limit) q.set('limit', options.limit.toString());
      if (options?.before) q.set('before', options.before);
      return request<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/api/chat/rooms/${roomId}/messages?${q.toString()}`
      );
    },
    sendMessage: (roomId: string, senderId: string, text: string) =>
      request<{ message: ChatMessage }>(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ senderId, text }),
      }).then((r) => r.message),
  },

  openMixers: {
    list: (params?: { status?: string; limit?: number; userId?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.userId) q.set('userId', params.userId);
      return request<{ openMixers: OpenMixer[] }>(`/api/open-mixers?${q.toString()}`).then(
        (r) => r.openMixers
      );
    },

    get: (id: string, viewerId?: string) => {
      const q = new URLSearchParams();
      if (viewerId) q.set('viewerId', viewerId);
      return request<{ openMixer: OpenMixer }>(`/api/open-mixers/${id}?${q.toString()}`).then(
        (r) => r.openMixer
      );
    },

    create: (data: {
      title: string;
      description?: string;
      activityId?: string;
      hostId: string;
      location: string;
      scheduledStart: string;
      scheduledEnd?: string;
      maxCapacity?: number;
      imageUrl?: string;
      color?: string;
      backgroundImage?: string;
    }) =>
      request<{ openMixer: OpenMixer }>('/api/open-mixers', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.openMixer),

    update: (id: string, data: {
      hostId: string;
      title?: string;
      description?: string;
      location?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
      maxCapacity?: number;
      imageUrl?: string;
      color?: string;
    }) =>
      request<{ openMixer: OpenMixer }>(`/api/open-mixers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then((r) => r.openMixer),

    uploadImage: async (id: string, hostId: string, file: { uri: string; type: string; name: string }) => {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, type: file.type, name: file.name } as unknown as Blob);
      formData.append('hostId', hostId);
      const res = await fetch(`${BASE_URL}/api/open-mixers/${id}/upload-image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return (await res.json()) as { imageUrl: string };
    },

    join: (id: string, userId: string) =>
      request<{ participant: OpenMixerParticipant }>(`/api/open-mixers/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }).then((r) => r.participant),

    leave: (id: string, userId: string) =>
      request<{ success: boolean }>(`/api/open-mixers/${id}/leave`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }),

    setStatus: (id: string, status: OpenMixerStatus, hostId: string) =>
      request<{ openMixer: OpenMixer }>(`/api/open-mixers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, hostId }),
      }).then((r) => r.openMixer),

    generatePairings: (id: string, hostId: string) =>
      request<{ pairings: OpenMixerPairing[]; count: number }>(
        `/api/open-mixers/${id}/generate-pairings`,
        { method: 'POST', body: JSON.stringify({ hostId }) }
      ),
  },

  // Direct Messages (1:1 messaging with requests)
  dm: {
    getConversations: (userId: string) =>
      request<{
        accepted: DirectConversation[];
        pendingReceived: DirectConversation[];
        pendingSent: DirectConversation[];
      }>(`/api/dm/conversations?userId=${userId}`),

    sendRequest: (senderId: string, recipientId: string, message?: string) =>
      request<{ conversation: { id: string; status: string } }>('/api/dm/request', {
        method: 'POST',
        body: JSON.stringify({ senderId, recipientId, message }),
      }).then((r) => r.conversation),

    acceptRequest: (conversationId: string, userId: string) =>
      request<{ conversation: { id: string; status: string } }>(
        `/api/dm/conversations/${conversationId}/accept`,
        { method: 'POST', body: JSON.stringify({ userId }) }
      ).then((r) => r.conversation),

    declineRequest: (conversationId: string, userId: string) =>
      request<{ conversation: { id: string; status: string } }>(
        `/api/dm/conversations/${conversationId}/decline`,
        { method: 'POST', body: JSON.stringify({ userId }) }
      ).then((r) => r.conversation),

    getMessages: (
      conversationId: string,
      userId: string,
      options?: { limit?: number; before?: string }
    ) => {
      const q = new URLSearchParams({ userId });
      if (options?.limit) q.set('limit', options.limit.toString());
      if (options?.before) q.set('before', options.before);
      return request<{ messages: DirectMessage[]; hasMore: boolean; status: string }>(
        `/api/dm/conversations/${conversationId}/messages?${q.toString()}`
      );
    },

    sendMessage: (conversationId: string, senderId: string, text: string) =>
      request<{ message: DirectMessage }>(`/api/dm/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ senderId, text }),
      }).then((r) => r.message),

    getConversationWith: (userId: string, otherUserId: string) =>
      request<{ conversation: { id: string; status: string } | null }>(
        `/api/dm/conversation-with?userId=${userId}&otherUserId=${otherUserId}`
      ).then((r) => r.conversation),

    getPendingCount: (userId: string) =>
      request<{ count: number }>(`/api/dm/pending-count?userId=${userId}`).then((r) => r.count),
  },
};
