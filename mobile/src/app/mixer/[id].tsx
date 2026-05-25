import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  Sparkles,
  Zap,
  Lock,
  Play,
  CheckCircle2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pencil,
  GitPullRequest,
  Check,
  X,
  Star,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import type { MixerStatus, PairingMode, MixerChangeRequest, MixerRecap } from '@/lib/types';
import { MixerRatingModal } from '@/components/MixerRatingModal';
import { StoryCameraModal } from '@/components/stories/StoryCameraModal';
import { HeroBlock } from '@/components/mixer-detail/HeroBlock';
import { PollCard } from '@/components/mixer-detail/PollCard';
import { RosterCard, abbreviate } from '@/components/mixer-detail/RosterCard';
import { MyClusterCard } from '@/components/mixer-detail/MyClusterCard';

const STATUS_COLORS: Record<MixerStatus, string> = {
  upcoming: '#FFFFFF',
  locked: '#F59E0B',
  live: '#22C55E',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<MixerStatus, string> = {
  upcoming: 'Upcoming',
  locked: 'Locked In',
  live: 'Live Now',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ICEBREAKERS = [
  'What is the most spontaneous thing you have ever done?',
  'If you could only eat one cuisine for the rest of your life, what would it be?',
  'What is a skill you want to learn but haven\'t started yet?',
];

function LivePulseBadge() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        backgroundColor: '#22C55E20',
        borderWidth: 1,
        borderColor: '#22C55E50',
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#22C55E',
          opacity: pulseAnim,
        }}
      />
      <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
        LIVE NOW
      </Text>
    </View>
  );
}

function EnergyDots({ level, max = 5 }: { level: number; max?: number }) {
  const normalized = Math.round((level / 10) * max);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < normalized ? '#F59E0B' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={{
        backgroundColor: '#111111',
        borderRadius: 20,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

export default function MixerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const { data: mixer, isLoading } = useQuery({
    queryKey: ['mixer', id, profile?.id],
    queryFn: () => api.mixers.get(id, profile?.id ?? undefined),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === 'live' ? 10000 : false),
  });

  const isChair =
    mixer?.groupA?.members?.some(
      (m) => m.userId === profile?.id && (m.role === 'social_chair' || m.role === 'admin')
    ) ||
    mixer?.groupB?.members?.some(
      (m) => m.userId === profile?.id && (m.role === 'social_chair' || m.role === 'admin')
    );

  // Fetch canPost info when mixer is live and user is a chair
  const { data: canPostData } = useQuery({
    queryKey: ['can-post', profile?.id, id],
    queryFn: () => api.stories.canPost(profile!.id),
    enabled: !!profile?.id && mixer?.status === 'live' && !!isChair,
  });
  const postableMixers = (canPostData?.postableMixers ?? []).filter((m) => m.mixerId === id);

  // Fetch pending change requests when mixer is upcoming
  const { data: changeRequests = [] } = useQuery<MixerChangeRequest[]>({
    queryKey: ['mixer-change-requests', id],
    queryFn: () => api.mixers.getChangeRequests(id),
    enabled: !!id && mixer?.status === 'upcoming',
  });
  const pendingChangeRequest = changeRequests.find((cr) => cr.status === 'pending') ?? null;

  // Fetch recap data (topStories) when mixer is completed
  const { data: recapData } = useQuery<MixerRecap>({
    queryKey: ['recap', id],
    queryFn: () => api.recaps.getRecap(id),
    enabled: !!id && mixer?.status === 'completed',
  });

  const respondChangeRequestMutation = useMutation({
    mutationFn: ({ crId, response }: { crId: string; response: 'accepted' | 'declined' }) =>
      api.mixers.respondToChangeRequest(id, crId, { response, responderId: profile!.id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['mixer-change-requests', id] });
      queryClient.invalidateQueries({ queryKey: ['mixer', id] });
    },
  });

  const myParticipant = mixer?.participants?.find((p) => p.userId === profile?.id);
  const myPairing = mixer?.pairings?.find(
    (p) => p.userAId === profile?.id || p.userBId === profile?.id
  );
  const myPartner = myPairing
    ? myPairing.userAId === profile?.id
      ? myPairing.userB
      : myPairing.userA
    : null;

  const statusMutation = useMutation({
    mutationFn: (status: MixerStatus) => api.mixers.setStatus(id, status, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer', id] });
      queryClient.invalidateQueries({ queryKey: ['mixers'] });
    },
  });

  const pairingModeMutation = useMutation({
    mutationFn: (mode: PairingMode) => api.mixers.setPairingMode(id, mode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mixer', id] }),
  });

  const generatePairingsMutation = useMutation({
    mutationFn: (mode: 'random' | 'smart') => api.mixers.generatePairings(id, mode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mixer', id] }),
  });

  const setClusterSizeMutation = useMutation({
    mutationFn: (size: number) => api.clusters.setSize(id, size, profile!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mixer', id] }),
  });

  const generateClustersMutation = useMutation({
    mutationFn: () => api.clusters.generate(id, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer', id] });
      queryClient.invalidateQueries({ queryKey: ['my-cluster', id] });
    },
  });

  const rsvpMutation = useMutation<void, Error, string>({
    mutationFn: async (rsvpStatus: string): Promise<void> => {
      if (myParticipant) {
        await api.mixers.updateRsvp(id, profile!.id, rsvpStatus);
      } else {
        // Add participant for every group they belong to in this mixer
        const groupIds: string[] = [];
        if (mixer?.groupA?.members?.some((m) => m.userId === profile?.id)) groupIds.push(mixer.groupAId);
        if (mixer?.groupB?.members?.some((m) => m.userId === profile?.id)) groupIds.push(mixer.groupBId);
        if (groupIds.length === 0) groupIds.push(profile!.groupMemberships?.[0]?.groupId ?? '');
        await Promise.all(groupIds.map((groupId) =>
          api.mixers.addParticipant(id, { userId: profile!.id, groupId, rsvpStatus })
        ));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mixer', id] }),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!mixer) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={48} color="rgba(255,255,255,0.08)" />
        <Text style={{ color: '#606060', fontSize: 16, marginTop: 12 }}>Mixer not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111111', borderRadius: 100 }}
        >
          <Text style={{ color: '#A0A0A0', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[mixer.status];
  const groupAParticipants = mixer.participants?.filter((p) => p.groupId === mixer.groupAId) ?? [];
  const groupBParticipants = mixer.participants?.filter((p) => p.groupId === mixer.groupBId) ?? [];
  const totalAttending = groupAParticipants.length + groupBParticipants.length;

  // Which group does the current user belong to in this mixer?
  const myGroupId = mixer.groupA?.members?.some((m) => m.userId === profile?.id)
    ? mixer.groupAId
    : mixer.groupB?.members?.some((m) => m.userId === profile?.id)
    ? mixer.groupBId
    : null;

  // The opposing group to rate
  const rateGroupId = myGroupId === mixer.groupAId ? mixer.groupBId : myGroupId === mixer.groupBId ? mixer.groupAId : null;
  const rateGroupName = rateGroupId === mixer.groupAId ? (mixer.groupA?.name ?? 'Group A') : (mixer.groupB?.name ?? 'Group B');

  const handleSubmitRating = async (rating: number, comment?: string, tags?: string[]) => {
    if (!profile?.id || !rateGroupId) return;
    setIsSubmittingRating(true);
    try {
      await api.ratings.submit({ mixerId: id, raterId: profile.id, ratedGroupId: rateGroupId, rating, comment, tags });
      setRatingModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['mixer', id] });
      queryClient.invalidateQueries({ queryKey: ['mixers'] });
      queryClient.invalidateQueries({ queryKey: ['available-recaps'] });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // All members of my group, enriched with their RSVP status if they've responded
  const myGroupMembers = (myGroupId === mixer.groupAId ? mixer.groupA?.members : mixer.groupB?.members) ?? [];
  const groupRsvpList = myGroupMembers.map((member) => {
    const participant = (mixer.participants ?? []).find((p) => p.userId === member.userId);
    const name = participant?.user?.name ?? (member.userId === profile?.id ? profile?.name : null);
    return {
      userId: member.userId,
      name,
      rsvpStatus: participant?.rsvpStatus ?? null,
    };
  });

  const rsvpColor = (s: string) =>
    s === 'going' ? '#22C55E' : s === 'maybe' ? '#F59E0B' : '#EF4444';
  const rsvpLabel = (s: string) =>
    s === 'going' ? 'Going' : s === 'maybe' ? 'Maybe' : 'Out';

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Custom header */}
      <LinearGradient
        colors={['#0A0A0A', '#000000']}
        style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={{ color: '#A0A0A0', fontWeight: '700', fontSize: 15 }}>Mixer</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isChair && mixer.status === 'upcoming' && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/edit-mixer-request',
                    params: {
                      mixerId: id,
                      groupId: myGroupId ?? '',
                      currentStart: mixer.scheduledStart,
                      currentEnd: mixer.scheduledEnd ?? '',
                      currentLocation: mixer.location,
                      currentActivityId: mixer.activityId ?? '',
                    },
                  });
                }}
                style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}
              >
                <Pencil size={18} color="#FFFFFF" />
              </Pressable>
            )}
            {isChair && mixer.status === 'live' && postableMixers.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setCameraModalOpen(true);
                }}
                style={{ width: 42, height: 42, backgroundColor: 'rgba(168,85,247,0.25)', borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)' }}
              >
                <Camera size={18} color="#FFFFFF" />
              </Pressable>
            )}
            {mixer.status === 'live' ? (
              <LivePulseBadge />
            ) : (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: statusColor + '20' }}>
                <Text style={{ color: statusColor, fontWeight: '700', fontSize: 12 }}>
                  {STATUS_LABELS[mixer.status]}
                </Text>
              </View>
            )}
          </View>
        </View>

      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* New-design hero — replaces the old title bar block */}
        <HeroBlock
          headlineTop={`${format(new Date(mixer.scheduledStart), 'EEEE')} night`}
          headlineAccent={`at ${mixer.location || 'TBD'}.`}
          homeGroupName={mixer.groupA?.name ?? 'Group A'}
          awayGroupName={mixer.groupB?.name ?? 'Group B'}
          dateLabel={format(new Date(mixer.scheduledStart), 'EEE M/d')}
          timeLabel={format(new Date(mixer.scheduledStart), 'h:mm a')}
          locationLabel={mixer.location || 'TBD'}
          isGoing={
            mixer.participants?.some(
              (p) => p.userId === profile?.id && p.rsvpStatus === 'going',
            ) ?? false
          }
        />

        {/* Polls — theme + activity. Hidden for completed/cancelled mixers. */}
        {mixer.status !== 'completed' && mixer.status !== 'cancelled' && (
          <>
            <PollCard
              mixerId={id}
              userId={profile?.id}
              kind="theme"
              title="Pick the theme"
              metaRight="Closes 6 PM"
            />
            <PollCard
              mixerId={id}
              userId={profile?.id}
              kind="activity"
              title="Pick the activity"
              metaRight="Closes 6 PM"
            />
          </>
        )}

        {/* Roster — replaces the old side-by-side group card */}
        {mixer.status !== 'completed' && (
          <RosterCard
            totalConfirmed={groupAParticipants.length + groupBParticipants.length}
            home={{
              name: mixer.groupA?.name ?? 'Group A',
              college: mixer.college?.name ?? '',
              abbreviation: abbreviate(mixer.groupA?.name ?? 'GA'),
              goingCount: groupAParticipants.filter((p) => p.rsvpStatus === 'going').length,
              role: 'Hosting',
            }}
            away={{
              name: mixer.groupB?.name ?? 'Group B',
              college: mixer.college?.name ?? '',
              abbreviation: abbreviate(mixer.groupB?.name ?? 'GB'),
              goingCount: groupBParticipants.filter((p) => p.rsvpStatus === 'going').length,
              role: 'Joining',
            }}
          />
        )}

        {/* My cluster (only when clusterSize >= 3) */}
        {mixer.clusterSize >= 3 && profile?.id && (
          <MyClusterCard
            mixerId={mixer.id}
            userId={profile.id}
            homeGroupId={mixer.groupAId}
            awayGroupId={mixer.groupBId}
          />
        )}

        {/* Post Story Card — shown when mixer is live and user is admin/social_chair */}
        {mixer.status === 'live' && isChair && postableMixers.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setCameraModalOpen(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(168,85,247,0.12)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.35)',
              padding: 18,
              marginBottom: 14,
              gap: 16,
            }}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(168,85,247,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Camera size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginBottom: 2 }}>
                Share a Story
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                {postableMixers[0]?.hasPosted
                  ? 'Your group already posted — stories expire in 24h'
                  : 'Post a photo from tonight\'s mixer'}
              </Text>
            </View>
            {!postableMixers[0]?.hasPosted && (
              <View style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Post</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Change Request Banner */}
        {pendingChangeRequest && (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(168,139,250,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,139,250,0.25)', padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GitPullRequest size={15} color="#4F7CFF" />
              <Text style={{ color: '#4F7CFF', fontWeight: '800', fontSize: 14, flex: 1 }}>
                Change Requested
              </Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: 'rgba(168,139,250,0.15)' }}>
                <Text style={{ color: '#4F7CFF', fontWeight: '700', fontSize: 11 }}>Pending</Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={13} color="#9CA3AF" />
                <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '600' }}>
                  {format(new Date(pendingChangeRequest.proposedStart), 'EEE, MMM d · h:mm a')}
                  {pendingChangeRequest.proposedEnd ? ` – ${format(new Date(pendingChangeRequest.proposedEnd), 'h:mm a')}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={13} color="#9CA3AF" />
                <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '600' }}>
                  {pendingChangeRequest.proposedLocation}
                </Text>
              </View>
              {pendingChangeRequest.message ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <MessageCircle size={13} color="#9CA3AF" style={{ marginTop: 2 }} />
                  <Text style={{ color: '#9CA3AF', fontSize: 13, flex: 1 }}>
                    "{pendingChangeRequest.message}"
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Show accept/decline only to the OTHER group's chair */}
            {isChair && myGroupId !== pendingChangeRequest.requestingGroupId && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    respondChangeRequestMutation.mutate({ crId: pendingChangeRequest.id, response: 'accepted' });
                  }}
                  disabled={respondChangeRequestMutation.isPending}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#22C55E20', borderWidth: 1, borderColor: '#22C55E50' }}
                >
                  <Check size={14} color="#22C55E" strokeWidth={3} />
                  <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 13 }}>Accept</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    respondChangeRequestMutation.mutate({ crId: pendingChangeRequest.id, response: 'declined' });
                  }}
                  disabled={respondChangeRequestMutation.isPending}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444450' }}
                >
                  <X size={14} color="#EF4444" strokeWidth={3} />
                  <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Decline</Text>
                </Pressable>
              </View>
            )}
            {isChair && myGroupId === pendingChangeRequest.requestingGroupId && (
              <Text style={{ color: '#6B7280', fontSize: 12, textAlign: 'center' }}>
                Waiting for the other group to respond...
              </Text>
            )}
          </View>
        )}

        {/* Details section — hidden for completed recaps */}
        {mixer.status !== 'completed' && (
        <SectionCard>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 16 }}>Details</Text>

          <View style={{ gap: 14 }}>
            {/* Date/time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF30' }}>
                <Calendar size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <SectionLabel>Date & Time</SectionLabel>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                  {format(new Date(mixer.scheduledStart), 'EEEE, MMM d, yyyy')}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                  {format(new Date(mixer.scheduledStart), 'h:mm a')}
                  {mixer.scheduledEnd ? ` – ${format(new Date(mixer.scheduledEnd), 'h:mm a')}` : ''}
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF6B6B15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF6B6B30' }}>
                <MapPin size={18} color="#FF6B6B" />
              </View>
              <View style={{ flex: 1 }}>
                <SectionLabel>Location</SectionLabel>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{mixer.location}</Text>
              </View>
            </View>

            {/* Activity */}
            {mixer.activity && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Sparkles size={18} color="#A0A0A0" />
                </View>
                <View style={{ flex: 1 }}>
                  <SectionLabel>Activity</SectionLabel>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{mixer.activity.name}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                      <Text style={{ color: '#A0A0A0', fontWeight: '600', fontSize: 11, textTransform: 'capitalize' }}>
                        {mixer.activity.category.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <EnergyDots level={mixer.activity.energyLevel} />
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>Energy</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="#6B7280" />
                      <Text style={{ color: '#6B7280', fontSize: 12 }}>{mixer.activity.durationMinutes} min</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </SectionCard>
        )}

        {/* Activity Instructions (collapsible) */}
        {mixer.activity && (
          <SectionCard>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInstructionsExpanded((v) => !v);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Instructions</Text>
              </View>
              {instructionsExpanded ? (
                <ChevronUp size={18} color="#6B7280" />
              ) : (
                <ChevronDown size={18} color="#6B7280" />
              )}
            </Pressable>

            {instructionsExpanded && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>
                  {mixer.activity.instructions}
                </Text>
                {mixer.activity.supplies && (
                  <View>
                    <SectionLabel>Supplies needed</SectionLabel>
                    <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 20 }}>
                      {mixer.activity.supplies}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </SectionCard>
        )}

        {/* Participants */}
        {(groupAParticipants.length > 0 || groupBParticipants.length > 0) && (
          <SectionCard>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 14 }}>
              Participants
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Group A column */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  numberOfLines={1}
                >
                  {mixer.groupA?.name ?? 'Group A'}
                </Text>
                {groupAParticipants.map((p) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#FFFFFF15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#FFFFFF30',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                        {p.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {p.user?.name ?? 'Unknown'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rsvpColor(p.rsvpStatus) }} />
                        <Text style={{ color: rsvpColor(p.rsvpStatus), fontSize: 11, fontWeight: '600' }}>
                          {rsvpLabel(p.rsvpStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                {groupAParticipants.length === 0 && (
                  <Text style={{ color: '#4B5563', fontSize: 12, fontStyle: 'italic' }}>None yet</Text>
                )}
              </View>

              {/* Divider */}
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />

              {/* Group B column */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  numberOfLines={1}
                >
                  {mixer.groupB?.name ?? 'Group B'}
                </Text>
                {groupBParticipants.map((p) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#FF6B6B15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#FF6B6B30',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 15 }}>
                        {p.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {p.user?.name ?? 'Unknown'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rsvpColor(p.rsvpStatus) }} />
                        <Text style={{ color: rsvpColor(p.rsvpStatus), fontSize: 11, fontWeight: '600' }}>
                          {rsvpLabel(p.rsvpStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                {groupBParticipants.length === 0 && (
                  <Text style={{ color: '#4B5563', fontSize: 12, fontStyle: 'italic' }}>None yet</Text>
                )}
              </View>
            </View>
          </SectionCard>
        )}

        {/* RSVP section for upcoming mixers */}
        {mixer.status === 'upcoming' && profile && (
          <SectionCard>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginBottom: 12 }}>Your RSVP</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['going', 'maybe', 'not_going'] as const).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    rsvpMutation.mutate(status);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 100,
                    alignItems: 'center',
                    backgroundColor:
                      myParticipant?.rsvpStatus === status
                        ? rsvpColor(status)
                        : 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    borderColor:
                      myParticipant?.rsvpStatus === status
                        ? rsvpColor(status)
                        : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color:
                        myParticipant?.rsvpStatus === status ? '#FFFFFF' : '#6B7280',
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Nope'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Group RSVP list */}
            {groupRsvpList.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />
                <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                  Your Group
                </Text>
                <View style={{ gap: 10 }}>
                  {groupRsvpList.map((p) => (
                    <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.10)',
                        flexShrink: 0,
                      }}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                          {p.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                        {p.name ?? 'Unknown'}
                        {p.userId === profile?.id ? ' (You)' : ''}
                      </Text>
                      {p.rsvpStatus ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: rsvpColor(p.rsvpStatus) + '18' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: rsvpColor(p.rsvpStatus) }} />
                          <Text style={{ color: rsvpColor(p.rsvpStatus), fontSize: 11, fontWeight: '700' }}>
                            {rsvpLabel(p.rsvpStatus)}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>No response</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </SectionCard>
        )}

        {/* Your Pairing — live only */}
        {mixer.status === 'live' && myPairing && myPartner && (
          <View style={{ marginBottom: 14 }}>
            <LinearGradient
              colors={['rgba(168,85,247,0.12)', 'rgba(168,85,247,0.05)']}
              style={{
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.25)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <UserCheck size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Your Pairing</Text>
              </View>

              {/* Partner card */}
              <View
                style={{
                  backgroundColor: '#111111',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(168,85,247,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22 }}>
                    {myPartner.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>
                    {myPartner.name}
                  </Text>
                  {myPartner.bio && (
                    <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                      {myPartner.bio}
                    </Text>
                  )}
                </View>
              </View>

              {/* Shared interests */}
              {(() => {
                const myInterestNames = new Set(
                  (profile?.interests ?? []).map((i: { interest: { name: string } }) => i.interest.name)
                );
                const shared = (myPartner.interests ?? [])
                  .map((i: { interest: { name: string } }) => i.interest.name)
                  .filter((n: string) => myInterestNames.has(n))
                  .slice(0, 5);
                if (shared.length === 0) return null;
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                      You both like
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {shared.map((name: string) => (
                        <View
                          key={name}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 100,
                            backgroundColor: 'rgba(167,139,250,0.18)',
                            borderWidth: 1,
                            borderColor: 'rgba(167,139,250,0.35)',
                          }}
                        >
                          <Text style={{ color: '#4F7CFF', fontSize: 12, fontWeight: '600' }}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Icebreakers */}
              <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Icebreakers
              </Text>
              {ICEBREAKERS.map((prompt, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: i < ICEBREAKERS.length - 1 ? 8 : 0,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#4F7CFF20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ color: '#4F7CFF', fontWeight: '800', fontSize: 11 }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 20, flex: 1 }}>{prompt}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* Social Chair Controls */}
        {isChair && mixer.status !== 'completed' && (
          <SectionCard style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Zap size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Social Chair Controls</Text>
            </View>

            {/* Pairing Mode toggle */}
            <SectionLabel>Pairing Mode</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['manual', 'random', 'smart'] as PairingMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    pairingModeMutation.mutate(mode);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 100,
                    alignItems: 'center',
                    backgroundColor: mixer.pairingMode === mode ? '#FFFFFF' : 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    borderColor: mixer.pairingMode === mode ? '#FFFFFF' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: mixer.pairingMode === mode ? '#000000' : '#6B7280',
                      fontWeight: '700',
                      fontSize: 12,
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Generate Pairings */}
            {(mixer.pairingMode === 'random' || mixer.pairingMode === 'smart') && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  generatePairingsMutation.mutate(
                    mixer.pairingMode === 'smart' ? 'smart' : 'random'
                  );
                }}
                disabled={generatePairingsMutation.isPending}
                style={{ borderRadius: 100, overflow: 'hidden', marginBottom: 10, opacity: generatePairingsMutation.isPending ? 0.6 : 1 }}
              >
                <LinearGradient
                  colors={['#3AE3A0', '#3AE3A0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 100,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {generatePairingsMutation.isPending ? (
                    <ActivityIndicator color="#062a14" size="small" />
                  ) : (
                    <Zap size={16} color="#062a14" />
                  )}
                  <Text style={{ color: '#062a14', fontWeight: '800', fontSize: 14 }}>
                    Generate {mixer.pairingMode === 'smart' ? 'Smart' : 'Random'} Pairings
                  </Text>
                </LinearGradient>
              </Pressable>
            )}

            {/* Cluster size selector */}
            <SectionLabel>Cluster Size</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[2, 3, 4, 6].map((size) => {
                const isActive = mixer.clusterSize === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setClusterSizeMutation.mutate(size);
                    }}
                    disabled={setClusterSizeMutation.isPending}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 100,
                      alignItems: 'center',
                      backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.07)',
                      borderWidth: 1,
                      borderColor: isActive ? '#FFFFFF' : 'transparent',
                    }}
                  >
                    <Text style={{ color: isActive ? '#000000' : '#6B7280', fontWeight: '700', fontSize: 13 }}>
                      {size === 2 ? '1v1' : `${Math.ceil(size / 2)}v${Math.floor(size / 2)}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Generate Clusters (only when cluster size ≥ 3) */}
            {mixer.clusterSize >= 3 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  generateClustersMutation.mutate();
                }}
                disabled={generateClustersMutation.isPending}
                style={{ borderRadius: 100, overflow: 'hidden', marginBottom: 10, opacity: generateClustersMutation.isPending ? 0.6 : 1 }}
              >
                <LinearGradient
                  colors={['#3AE3A0', '#3AE3A0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 100,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {generateClustersMutation.isPending ? (
                    <ActivityIndicator color="#062a14" size="small" />
                  ) : (
                    <Zap size={16} color="#062a14" />
                  )}
                  <Text style={{ color: '#062a14', fontWeight: '800', fontSize: 14 }}>
                    Generate Clusters
                  </Text>
                </LinearGradient>
              </Pressable>
            )}

            {/* View/Edit Pairings */}
            <Pressable
              onPress={() => router.push(`/pairing-editor?mixerId=${mixer.id}`)}
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 100,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#A0A0A0', fontWeight: '700', fontSize: 14 }}>
                View / Edit Pairings
              </Text>
            </Pressable>

            {/* Social Chair Chat */}
            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!profile) return;
                try {
                  const rooms = await api.chat.getRooms(profile.id);
                  const room = rooms.find(
                    (r: { type: string; mixerId?: string }) =>
                      r.type === 'mixer' && r.mixerId === mixer.id
                  );
                  if (room) {
                    router.push({
                      pathname: '/chat-room',
                      params: { roomId: room.id, roomName: room.name, mixerId: mixer.id },
                    });
                  }
                } catch (e) {
                  // room may not exist yet — silently ignore
                }
              }}
              style={{
                borderRadius: 100,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <MessageCircle size={16} color="#A0A0A0" />
              <Text style={{ color: '#A0A0A0', fontWeight: '700', fontSize: 14 }}>
                Social Chair Chat
              </Text>
            </Pressable>

            {/* Lifecycle buttons */}
            {mixer.status === 'upcoming' && (
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    statusMutation.mutate('live');
                  }}
                  disabled={statusMutation.isPending}
                >
                  <LinearGradient
                    colors={['#3AE3A0', '#3AE3A0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 100,
                      paddingVertical: 14,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: statusMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Play size={16} color="#062a14" />
                    <Text style={{ color: '#062a14', fontWeight: '800', fontSize: 14 }}>Go Live!</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    statusMutation.mutate('locked');
                  }}
                  disabled={statusMutation.isPending}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 100,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                    opacity: statusMutation.isPending ? 0.6 : 1,
                  }}
                >
                  <Lock size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Lock Mixer</Text>
                </Pressable>
              </View>
            )}

            {mixer.status === 'locked' && (
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  statusMutation.mutate('live');
                }}
                disabled={statusMutation.isPending}
              >
                <LinearGradient
                  colors={['#3AE3A0', '#3AE3A0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 100,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: statusMutation.isPending ? 0.6 : 1,
                  }}
                >
                  <Play size={16} color="#062a14" />
                  <Text style={{ color: '#062a14', fontWeight: '800', fontSize: 14 }}>Go Live!</Text>
                </LinearGradient>
              </Pressable>
            )}

            {mixer.status === 'live' && (
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  statusMutation.mutate('completed');
                }}
                disabled={statusMutation.isPending}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 100,
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: statusMutation.isPending ? 0.6 : 1,
                }}
              >
                <CheckCircle2 size={16} color="#6B7280" />
                <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 14 }}>Complete Mixer</Text>
              </Pressable>
            )}
          </SectionCard>
        )}

        {/* ── Photos section (completed mixers) ─────────────────────────── */}
        {mixer.status === 'completed' && (
          <SectionCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Camera size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Photos</Text>
            </View>
            {recapData && recapData.topStories.filter((s) => s.mediaType === 'image').length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {recapData.topStories
                  .filter((s) => s.mediaType === 'image')
                  .map((story) => {
                    const photoUrl = api.stories.getFileUrl(story.storagePath);
                    const size = (Dimensions.get('window').width - 40 - 6) / 3;
                    return (
                      <Image
                        key={story.id}
                        source={{ uri: photoUrl }}
                        style={{ width: size, height: size, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}
                        resizeMode="cover"
                      />
                    );
                  })}
              </View>
            ) : !recapData ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <Camera size={32} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No photos</Text>
              </View>
            )}
          </SectionCard>
        )}

        {/* ── Rating section (completed mixers) ─────────────────────────── */}
        {mixer.status === 'completed' && myGroupId && rateGroupId && (
          <SectionCard>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Star size={16} color="#FBBF24" fill="#FBBF24" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Rate Your Experience</Text>
              </View>
              {mixer.myRating != null ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                    You rated {rateGroupName}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[1,2,3,4,5].map((star) => {
                      const filled = star <= Math.round(mixer.myRating! / 2);
                      return (
                        <Star
                          key={star}
                          size={28}
                          color={filled ? '#FBBF24' : 'rgba(255,255,255,0.2)'}
                          fill={filled ? '#FBBF24' : 'transparent'}
                          strokeWidth={filled ? 0 : 1.5}
                        />
                      );
                    })}
                    <Text style={{ color: '#FBBF24', fontWeight: '700', fontSize: 16, marginLeft: 8, alignSelf: 'center' }}>
                      {Math.round(mixer.myRating / 2)}/5
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setRatingModalVisible(true);
                    }}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text style={{ color: '#9CA3AF', fontSize: 12, textDecorationLine: 'underline' }}>Change rating</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                    How was your mixer with {rateGroupName}?
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setRatingModalVisible(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.18)',
                      borderRadius: 100,
                      paddingVertical: 14,
                    }}
                  >
                    <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Rate {rateGroupName}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <MixerRatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleSubmitRating}
        groupName={rateGroupName}
        isSubmitting={isSubmittingRating}
      />

      {postableMixers.length > 0 && (
        <StoryCameraModal
          visible={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          postableMixers={postableMixers}
          userId={profile?.id ?? ''}
          onStoryPosted={() => {
            setCameraModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['can-post', profile?.id, id] });
          }}
        />
      )}
    </View>
  );
}
