import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeekend, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInRight,
} from 'react-native-reanimated';
import {
  Flame,
  Users,
  Calendar,
  Trophy,
  MapPin,
  Plus,
  Star,
  TrendingUp,
  Zap,
  Map,
  Globe,
} from 'lucide-react-native';
import { NotificationBell } from '@/components/NotificationBell';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Group, Activity, GroupCategory, ActivityCategory, GlobalStoryFeedItem, OpenMixer } from '@/lib/types';
import { colors as C, fonts as F } from '@/lib/theme';
import { HeaderBackdrop } from '@/components/HeaderBackdrop';
import { MixerModeBanner } from '@/components/mixer/MixerModeBanner';
import { format as fmtDate } from 'date-fns';
import { ACTIVITIES } from '@/lib/activities';

import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard, GelPill, StoryBubble } from '@/components/gel';
import { TopMixerHeroCard } from '@/components/TopMixerHeroCard';
import { LeaderboardSheet } from '@/components/LeaderboardSheet';
import { BACKGROUND_IMAGES } from '@/app/create-open-mixer';

// Default group logo
const DEFAULT_GROUP_LOGO = require('../../../../assets/images/default-group-logo.png');

// App logo for header
const MIXR_LOGO = require('../../../../assets/images/mixr-logo-new.png');

// Add story button
const ADD_STORY_BUTTON = require('../../../../assets/images/add-story-button-cropped.png');

// Open Mixers section assets
const OPEN_MIXERS_GLOBE = require('../../../../assets/images/open-mixers-globe.png');
const OPEN_MIXERS_POST_BTN = require('../../../../assets/images/open-mixers-post-btn.png');
const OPEN_MIXERS_ALL_UPCOMING = require('../../../../assets/images/open-mixers-all-upcoming.png');
const OPEN_MIXERS_THIS_WEEKEND = require('../../../../assets/images/open-mixers-this-weekend.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated Flame Component
function AnimatedFlame({ size = 18, color = '#FF6B35' }: { size?: number; color?: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Scale animation - breathing effect
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.1, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 250, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Opacity flicker
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.7, { duration: 100 }),
        withTiming(1, { duration: 150 }),
        withTiming(0.85, { duration: 200 }),
        withTiming(1, { duration: 150 })
      ),
      -1,
      false
    );

    // Subtle rotation wobble
    rotation.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(-2, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Flame size={size} color={color} />
    </Animated.View>
  );
}

const CATEGORY_COLORS: Record<GroupCategory, string[]> = {
  sports: ['#FF6B6B', '#FF8E53'],
  social: ['#00D4AA', '#0096FF'],
  clubs:  ['#4F7CFF', '#28C988'],
  other:  ['#9CA3AF', '#6B7280'],
};

const ACTIVITY_COLORS: Record<ActivityCategory, string[]> = {
  drinking_game: ['#FF6B6B', '#FF8E53'],
  icebreaker: ['#00D4AA', '#0096FF'],
  competition: ['#4F7CFF', '#28C988'],
  themed: ['#EC4899', '#3AE3A0'],
  lowkey: ['#6EE7B7', '#059669'],
};

const STEPS = [
  {
    number: '1',
    title: 'Join or Create a Group',
    subtitle: 'Find your people — friends, teammates, classmates, or club members.',
  },
  {
    number: '2',
    title: 'Send a Mixer Request',
    subtitle: "Find a group you'd love to meet and send them a mixer invite.",
  },
  {
    number: '3',
    title: 'Get Paired & Meet IRL',
    subtitle: 'Smart or random pairing connects you with someone new. Show up and mix!',
  },
];

// ============================================
// STORIES ROW COMPONENT (Global Stories)
// ============================================

function StoriesRow({
  stories,
  isLoading,
  onStoryPress,
  onCameraPress,
  currentUserId,
  seenUserIds,
}: {
  stories: GlobalStoryFeedItem[];
  isLoading: boolean;
  onStoryPress: (userId: string, index: number) => void;
  onCameraPress: () => void;
  currentUserId?: string;
  seenUserIds: Set<string>;
}) {
  // Find if current user has a story
  const myStory = stories.find((item) => item.user?.id === currentUserId);
  // Filter out current user's story from the main list (it will be shown in "Your Story" position)
  const otherStories = stories.filter((item) => item.user?.id !== currentUserId);

  if (isLoading) {
    return (
      <View style={styles.storiesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.storyItemSkeleton}>
              <View style={styles.storyBubbleSkeleton} />
              <View style={styles.storyLabelSkeleton} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.storiesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
        style={{ overflow: 'visible' }}
      >
        {/* Your Story - shows outlined bubble if you have a story, otherwise Add button */}
        <View style={styles.storyItem}>
          {myStory ? (
            // User has a story - show their avatar with dashed outline
            <View style={styles.myStoryBubbleWrapper}>
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  // Tap on your own story - view it
                  onStoryPress(currentUserId!, 0);
                }}
              >
                <View style={styles.myStoryOutline}>
                  <StoryBubble
                    imageUrl={myStory.user?.avatarUrl ?? undefined}
                    size={64}
                    isLive={false}
                  />
                </View>
              </Pressable>
              {/* Larger + badge that's easy to tap */}
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  onCameraPress();
                }}
                style={styles.addMoreBadge}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Plus size={14} color={C.bg} strokeWidth={3} />
              </Pressable>
            </View>
          ) : (
            // No story - show Add button (replaces old purple gradient asset)
            <Pressable
              onPress={() => {
                Haptics.tap();
                onCameraPress();
              }}
              style={{
                marginTop: 10,
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: C.hairline,
              }}
            >
              <Plus size={22} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          )}
          {myStory ? (
            <Text style={styles.storyLabel} numberOfLines={1}>Your Story</Text>
          ) : (
            <Text style={{ color: C.ink, fontSize: 11, fontFamily: F.semibold, marginTop: 4 }}>Add Story</Text>
          )}
          {myStory && myStory.stories.length > 1 && (
            <View style={styles.storyCountBadge}>
              <Text style={styles.storyCountText}>{myStory.stories.length}</Text>
            </View>
          )}
        </View>

        {/* Other users' Story Bubbles */}
        {otherStories.map((item, index) => {
          const userId = item.user?.id ?? `unknown-${index}`;
          const userName = item.user?.name ?? 'Anonymous';
          const avatarUrl = item.user?.avatarUrl;
          const storyCount = item.stories.length;
          const isSeen = seenUserIds.has(userId);

          return (
            <Pressable
              key={userId}
              onPress={() => {
                Haptics.tap();
                onStoryPress(userId, index);
              }}
              style={styles.storyItem}
            >
              <StoryBubble
                imageUrl={avatarUrl ?? undefined}
                size={72}
                seen={isSeen}
              />
              <Text style={styles.storyLabel} numberOfLines={1}>
                {userName.split(' ')[0]}
              </Text>
              {storyCount > 1 && (
                <View style={styles.storyCountBadge}>
                  <Text style={styles.storyCountText}>{storyCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DiscoverGroupCard({ group, rank, onPress }: { group: Group; rank?: number; onPress: () => void }) {
  const colors = CATEGORY_COLORS[group.category] ?? ['#4F7CFF', '#28C988'];

  return (
    <Pressable onPress={onPress} style={styles.groupCard}>
      {/* Full bleed gradient background */}
      <LinearGradient
        colors={[colors[0], colors[1], `${colors[1]}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Specular highlight — 1px white line at top edge */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.25)',
        zIndex: 2,
      }} />

      {/* Glass inner highlight on top portion */}
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.35 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top: rank badge */}
      {rank && (
        <View style={{
          position: 'absolute',
          top: 12,
          left: 12,
          backgroundColor: 'rgba(0,0,0,0.45)',
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: 100,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.2)',
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
            #{rank}
          </Text>
        </View>
      )}

      {/* Bottom gradient overlay with info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.45, 1]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 14,
          paddingTop: 40,
          paddingBottom: 14,
          gap: 5,
        }}
      >
        {/* Category pill */}
        <View style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.3)',
          marginBottom: 4,
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {group.category}
          </Text>
        </View>

        <Text style={styles.groupCardName} numberOfLines={2}>
          {group.name}
        </Text>

        <View style={styles.groupCardMeta}>
          <Users size={11} color="rgba(255,255,255,0.75)" />
          <Text style={styles.groupCardMetaText}>{group._count?.members ?? 0} members</Text>
          {(group as Group & { mixerCount?: number }).mixerCount !== undefined && (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginLeft: 6 }} />
              <Zap size={11} color="#C4B5FD" />
              <Text style={[styles.groupCardMetaText, { color: '#C4B5FD' }]}>
                {(group as Group & { mixerCount?: number }).mixerCount} mixers
              </Text>
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function EnergyDots({ level }: { level: number }) {
  return (
    <View style={styles.energyDots}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.energyDot,
            { backgroundColor: i < level ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)' },
          ]}
        />
      ))}
    </View>
  );
}







function ActivityCard({ activity }: { activity: Activity }) {
  const colors = ACTIVITY_COLORS[activity.category] ?? [DS.Color.gelPurple, DS.Color.deepPurple];

  return (
    <View style={styles.activityCardWrapper}>
      <View style={styles.activityCardGradient}>
        {/* Full-bleed gradient background — same as group card */}
        <LinearGradient
          colors={[colors[0], colors[1], `${colors[1]}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 1px specular top edge */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 1, backgroundColor: 'rgba(255,255,255,0.28)', zIndex: 2,
        }} />
        {/* Glass inner highlight — top portion */}
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.45 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Bottom dark scrim */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.activityCardInner}>
          <View style={styles.activityHeader}>
            <View style={styles.activityCategoryBadge}>
              <Text style={styles.activityCategoryText}>
                {activity.category.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={styles.activityDurationBadge}>
              <Text style={styles.activityDurationText}>{activity.durationMinutes}m</Text>
            </View>
          </View>

          <Text style={styles.activityName} numberOfLines={2}>{activity.name}</Text>
          <Text style={styles.activityDescription} numberOfLines={2}>{activity.description}</Text>

          <View style={styles.activityFooter}>
            <View style={styles.activityEnergySection}>
              <Text style={styles.activityEnergyLabel}>Energy</Text>
              <EnergyDots level={activity.energyLevel} />
            </View>

            <View style={styles.activityTags}>
              <View style={styles.activityTag}>
                <Users size={10} color="rgba(255,255,255,0.9)" />
                <Text style={styles.activityTagText}>
                  {activity.minPeople}–{activity.maxPeople}
                </Text>
              </View>
              {activity.alcoholRelated && (
                <View style={styles.activityTag21}>
                  <Text style={styles.activityTag21Text}>21+</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Speech bubble with 3 dots — messages icon
function MessagesButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      hitSlop={12}
    >
      <Animated.View style={[{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.12)',
      }, animStyle]}>
        {/* Speech bubble SVG — filled dark with 3 dots */}
        <Svg width={20} height={20} viewBox="0 0 24 24">
          {/* Bubble body */}
          <Path
            d="M12 2C6.477 2 2 6.03 2 11c0 2.4 1.01 4.58 2.65 6.16L3 21l4.27-1.34C8.71 20.52 10.32 21 12 21c5.523 0 10-4.03 10-9s-4.477-9-10-9z"
            fill="rgba(255,255,255,0.88)"
          />
          {/* Three dots */}
          <Circle cx={8.5} cy={11} r={1.2} fill="rgba(20,20,30,0.85)" />
          <Circle cx={12} cy={11} r={1.2} fill="rgba(20,20,30,0.85)" />
          <Circle cx={15.5} cy={11} r={1.2} fill="rgba(20,20,30,0.85)" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const collegeName = profile?.college?.name ?? 'Your Campus';

  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openMixerFilter, setOpenMixerFilter] = useState<'all' | 'weekend'>('all');
  const [seenUserIds, setSeenUserIds] = useState<Set<string>>(new Set());

  // Load persisted seen story user IDs on mount
  useEffect(() => {
    AsyncStorage.getItem('seenStoryUserIds').then((raw) => {
      if (raw) {
        try {
          setSeenUserIds(new Set(JSON.parse(raw) as string[]));
        } catch {}
      }
    });
  }, []);

  // Global Stories feed query
  const { data: storiesFeedData, isLoading: storiesLoading } = useQuery({
    queryKey: ['global-stories-feed', profile?.collegeId, profile?.id],
    queryFn: () => api.globalStories.getFeed(profile!.collegeId!, profile?.id),
    enabled: !!profile?.collegeId,
  });

  const storiesFeed = storiesFeedData?.feed ?? [];

  // Top groups by mixer count
  const { data: topGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['top-groups', profile?.collegeId],
    queryFn: () => api.groups.getTop({ collegeId: profile?.collegeId ?? '', limit: 10 }),
    enabled: !!profile?.collegeId,
  });

  const { data: activities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.activities.list(),
    placeholderData: ACTIVITIES,
  });

  const { data: trendingActivities = [] } = useQuery({
    queryKey: ['activities-trending'],
    queryFn: () => api.activities.trending(),
    staleTime: 60 * 60_000,
  });

  const { data: topMixerData, isLoading: topMixerLoading } = useQuery({
    queryKey: ['top-mixer', profile?.collegeId],
    queryFn: () => api.rankings.getTop(profile!.collegeId!),
    enabled: !!profile?.collegeId,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', profile?.collegeId],
    queryFn: () => api.rankings.getLeaderboard(profile!.collegeId!, 10),
    enabled: !!profile?.collegeId,
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', profile?.collegeId],
    queryFn: () => api.heatmap.getHeatmap(profile!.collegeId!, 6),
    enabled: !!profile?.collegeId,
  });

  // Mixers count for this week
  const { data: mixersResponse } = useQuery({
    queryKey: ['mixers-college', profile?.collegeId],
    queryFn: () => api.mixers.list({ collegeId: profile!.collegeId! }),
    enabled: !!profile?.collegeId,
  });

  // User's own mixers (for their groups)
  const myGroupIds = profile?.groupMemberships?.map((m) => m.groupId) ?? [];
  const { data: myMixers = [] } = useQuery({
    queryKey: ['my-mixers', myGroupIds.join(','), myGroupIds.length],
    queryFn: async () => {
      if (myGroupIds.length === 0) return [];
      const results = await Promise.all(
        myGroupIds.map((gid) => api.mixers.list({ groupId: gid }))
      );
      const seen = new Set<string>();
      return results.flat().filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    enabled: !!profile && myGroupIds.length > 0,
  });

  // Extract mixers array from response (API returns { mixers: Mixer[] })
  const mixersData: { createdAt: string; status: string }[] = mixersResponse
    ? (Array.isArray(mixersResponse)
        ? mixersResponse
        : (mixersResponse as unknown as { mixers?: { createdAt: string; status: string }[] })?.mixers ?? [])
    : [];

  // Open Mixers feed
  const { data: openMixers = [] } = useQuery({
    queryKey: ['open-mixers', profile?.id],
    queryFn: () => api.openMixers.list({ limit: 50, userId: profile?.id }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['global-stories-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['top-groups'] }),
      queryClient.invalidateQueries({ queryKey: ['top-mixer'] }),
      queryClient.invalidateQueries({ queryKey: ['heatmap'] }),
      queryClient.invalidateQueries({ queryKey: ['mixers-college'] }),
      queryClient.invalidateQueries({ queryKey: ['open-mixers'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Nearest upcoming mixer for the hero block on Discover
  const nextMixerSummary = React.useMemo(() => {
    const now = Date.now();
    return (myMixers as Array<{ id: string; status: string; scheduledStart: string }>)
      .filter((m) => (m.status === 'upcoming' || m.status === 'locked' || m.status === 'live') && new Date(m.scheduledStart).getTime() > now - 1000 * 60 * 60 * 4)
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0];
  }, [myMixers]);

  const { data: nextMixerFull } = useQuery({
    queryKey: ['mixer', nextMixerSummary?.id, profile?.id],
    queryFn: () => api.mixers.get(nextMixerSummary!.id, profile?.id),
    enabled: !!nextMixerSummary?.id,
  });

  const displayGroups = topGroups ?? [];
  const spotlightActivity: Activity | undefined = (activities ?? ACTIVITIES)[0];
  const activeGroups = displayGroups.filter((g) => (g._count?.members ?? 0) > 0).length;
  const topVenueName = heatmapData?.heatmap?.[0]?.venueName ?? undefined;

  // Calculate user-specific stats
  const myGroupsCount = profile?.groupMemberships?.length ?? 0;
  const totalMyMixers = myMixers?.length ?? 0;
  const upcomingMixers = myMixers?.filter((m: { status: string }) =>
    m.status === 'upcoming' || m.status === 'locked'
  ) ?? [];
  const nextUpcomingMixer = upcomingMixers[0] as { scheduledStart?: string; groupA?: { name: string }; groupB?: { name: string } } | undefined;

  const handleStoryPress = (userId: string, _index: number) => {
    // Mark as seen and persist
    setSeenUserIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      AsyncStorage.setItem('seenStoryUserIds', JSON.stringify([...next]));
      return next;
    });
    router.push(`/view-global-story?userId=${userId}`);
  };

  const handleCameraPress = () => {
    router.push('/post-story');
  };

  const handleCreateGroup = () => {
    Haptics.tap();
    router.push('/create-group');
  };

  const handleBrowseGroups = () => {
    Haptics.tap();
    router.push('/(tabs)/groups');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <HeaderBackdrop height={280} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} progressViewOffset={38} />
        }
      >
        {/* Logo Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: DS.Spacing.lg, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.ink, fontSize: 40, fontFamily: F.bold, letterSpacing: -1.8 }}>
              mixr<Text style={{ color: C.amber }}>.</Text>
            </Text>
            <MessagesButton onPress={() => router.push('/notifications')} />
          </View>
        </View>

        {/* Pinned banner when the user is in an active mixer window */}
        <MixerModeBanner />

        {/* ─── Your next mixer — compact preview card ─── */}
        {nextMixerFull && (
          <View style={{ paddingHorizontal: DS.Spacing.lg, marginTop: 14, marginBottom: 10 }}>
            <Text style={{ color: C.ink3, fontFamily: F.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 2 }}>
              Your next mixer
            </Text>
            <Pressable
              onPress={() => router.push(`/mixer/${nextMixerFull.id}`)}
              style={({ pressed }) => ({
                backgroundColor: C.surface,
                borderRadius: 16,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: C.hairline,
                padding: 16,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {nextMixerFull.participants?.some((p) => p.userId === profile?.id && p.rsvpStatus === 'going') && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(58,227,160,0.12)', borderWidth: 1, borderColor: 'rgba(58,227,160,0.30)' }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.mint }} />
                    <Text style={{ color: C.mint, fontFamily: F.semibold, fontSize: 10, letterSpacing: 0.2 }}>YOU'RE GOING</Text>
                  </View>
                )}
                <Text style={{ color: C.ink3, fontFamily: F.medium, fontSize: 11, letterSpacing: 0.3 }}>
                  {fmtDate(new Date(nextMixerFull.scheduledStart), 'EEE M/d · h:mm a')}
                </Text>
              </View>
              <Text style={{ color: C.ink, fontFamily: F.bold, fontSize: 22, letterSpacing: -0.6, marginBottom: 4 }}>
                {fmtDate(new Date(nextMixerFull.scheduledStart), 'EEEE')} <Text style={{ color: C.amber }}>at {nextMixerFull.location || 'TBD'}.</Text>
              </Text>
              <Text style={{ fontSize: 13, fontFamily: F.semibold, letterSpacing: -0.1 }}>
                <Text style={{ color: C.navy }}>{nextMixerFull.groupA?.name ?? 'Group A'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: F.regular }}>  ×  </Text>
                <Text style={{ color: C.crimson }}>{nextMixerFull.groupB?.name ?? 'Group B'}</Text>
              </Text>
              <Text style={{ color: C.ink3, fontFamily: F.medium, fontSize: 11, marginTop: 10 }}>
                Tap to vote on theme & activity →
              </Text>
            </Pressable>
          </View>
        )}

        {/* Stories Row */}
        <StoriesRow
          stories={storiesFeed}
          isLoading={storiesLoading}
          onStoryPress={handleStoryPress}
          onCameraPress={handleCameraPress}
          currentUserId={profile?.id}
          seenUserIds={seenUserIds}
        />

        {/* Weekly Activity Suggestions */}
        {trendingActivities.length > 0 && (
          <View style={[styles.section, { marginBottom: 14 }]}>
            <Text style={{ color: C.ink3, fontFamily: F.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 2 }}>
              This week's vibes
            </Text>
            <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.hairline, overflow: 'hidden' }}>
              {trendingActivities.slice(0, 3).map((a, idx) => (
                <View
                  key={a.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: C.hairline,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: C.ink, fontFamily: F.bold, fontSize: 14, letterSpacing: -0.2 }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: C.ink, fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2 }}>
                      {a.name}
                    </Text>
                    <Text numberOfLines={1} style={{ color: C.ink3, fontFamily: F.medium, fontSize: 12, marginTop: 2 }}>
                      {a.category.replace(/_/g, ' ')}  ·  {a.durationMinutes} min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Open Mixers Section — individual cards */}
        <View style={styles.section}>
          {/* Section header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <Text style={{ color: C.ink, fontSize: 24, fontFamily: F.bold, letterSpacing: -0.6 }}>Open Mixers</Text>
          </View>

          {/* Filter tabs */}
          <View style={{ flexDirection: 'row', gap: 0, marginBottom: 14 }}>
            {(['all', 'weekend'] as const).map((key) => {
              const isActive = openMixerFilter === key;
              const label = key === 'all' ? 'All Upcoming' : 'This Weekend';
              return (
                <Pressable
                  key={key}
                  onPress={() => { Haptics.tap(); setOpenMixerFilter(key); }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginRight: 4,
                    borderBottomWidth: isActive ? 1.5 : 0,
                    borderBottomColor: C.ink,
                  }}
                >
                  <Text style={{
                    color: isActive ? C.ink : C.ink3,
                    fontSize: 12,
                    fontFamily: isActive ? F.semibold : F.medium,
                    letterSpacing: 0.1,
                  }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Individual mixer cards */}
          {(() => {
            const now = new Date();
            const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
            const thisWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
            const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
            const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });

            const allMixers = openMixers as OpenMixer[];
            const filteredMixers = allMixers.filter((m) => {
              const d = new Date(m.scheduledStart);
              if (openMixerFilter === 'weekend') {
                return isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd }) && isWeekend(d);
              }
              return true;
            });

            if (filteredMixers.length === 0) {
              return (
                <View style={{
                  paddingVertical: 32,
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: C.hairline,
                }}>
                  <Globe size={24} color={C.ink3} strokeWidth={1.5} />
                  <Text style={{ color: C.ink2, fontSize: 14, fontFamily: F.medium }}>
                    No mixers for this period
                  </Text>
                  <Pressable
                    onPress={() => { Haptics.tap(); router.push('/create-open-mixer'); }}
                    style={{
                      marginTop: 4,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: C.ink,
                    }}
                  >
                    <Text style={{ color: C.bg, fontSize: 13, fontFamily: F.semibold, letterSpacing: -0.1 }}>Post a Mixer</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View style={{ gap: 12 }}>
                {/* Mockup-style clean rows */}
                <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.hairline, overflow: 'hidden' }}>
                  {filteredMixers.map((mixer, idx) => {
                    const count = mixer._count?.participants ?? 0;
                    const isFull = count >= mixer.maxCapacity;
                    const isJoined = mixer.isParticipant || mixer.hostId === profile?.id;
                    const isLive = mixer.status === 'live';
                    const accent = mixer.color || C.amber;
                    const scheduledDate = new Date(mixer.scheduledStart);
                    const dateStr = scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const initial = (mixer.title || '?').trim().charAt(0).toUpperCase();
                    return (
                      <Pressable
                        key={mixer.id}
                        onPress={() => { Haptics.tap(); router.push(`/open-mixer/${mixer.id}`); }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 14,
                          paddingHorizontal: 16,
                          paddingVertical: 16,
                          borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                          borderTopColor: C.hairline,
                          backgroundColor: pressed ? C.surface3 : 'transparent',
                        })}
                      >
                        {/* Crest */}
                        <LinearGradient
                          colors={[accent, accent + '99']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{
                            width: 52, height: 52, borderRadius: 13,
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
                          }}
                        >
                          <Text style={{ color: C.ink, fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5 }}>{initial}</Text>
                        </LinearGradient>

                        {/* Middle */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text numberOfLines={1} style={{ color: C.ink, fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 }}>
                              {mixer.title}
                            </Text>
                            {isLive && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(58,227,160,0.14)' }}>
                                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.mint }} />
                                <Text style={{ color: C.mint, fontFamily: F.bold, fontSize: 9, letterSpacing: 0.5 }}>LIVE</Text>
                              </View>
                            )}
                          </View>
                          <Text numberOfLines={1} style={{ color: C.ink3, fontFamily: F.medium, fontSize: 12 }}>
                            {mixer.location} · {dateStr} · {timeStr}
                          </Text>
                          <Text style={{ color: C.ink3, fontFamily: F.medium, fontSize: 11, marginTop: 4 }}>
                            <Text style={{ color: isFull ? C.amber : C.ink2, fontFamily: F.bold }}>{count}</Text>
                            <Text>/{mixer.maxCapacity} {isFull ? 'full' : 'going'}</Text>
                          </Text>
                        </View>

                        {/* Right action */}
                        <View style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: isJoined ? C.surface2 : C.ink,
                        }}>
                          <Text style={{
                            color: isJoined ? C.ink2 : C.bg,
                            fontFamily: F.semibold,
                            fontSize: 13,
                            letterSpacing: -0.1,
                          }}>
                            {isJoined ? 'Joined' : 'Join'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}
        </View>

        {/* Top Mixer of the Week — hidden for now to declutter Discover */}
        {false && (topMixerData?.topMixer || topMixerLoading) && (
          <View style={styles.section}>
            <View style={{ gap: 2, marginBottom: DS.Spacing.md }}>
              <Text style={styles.sectionLabel2}>THIS WEEK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} color="#FBBF24" />
                <Text style={styles.sectionTitle2}>Top Mixer</Text>
              </View>
            </View>
            <TopMixerHeroCard
              topMixer={topMixerData?.topMixer ?? null}
              onPress={() => {
                if (topMixerData?.topMixer?.mixerId) {
                  router.push(`/mixer/${topMixerData.topMixer.mixerId}`);
                }
              }}
              onViewLeaderboard={() => {
                Haptics.tap();
                setLeaderboardVisible(true);
              }}
              isLoading={topMixerLoading}
            />
          </View>
        )}


      </ScrollView>

      {/* Leaderboard Modal */}
      <LeaderboardSheet
        visible={leaderboardVisible}
        onClose={() => setLeaderboardVisible(false)}
        leaderboard={leaderboardData?.leaderboard ?? []}
        weekStart={leaderboardData?.weekStart ?? ''}
        onMixerPress={(mixerId) => {
          setLeaderboardVisible(false);
          router.push(`/mixer/${mixerId}`);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  iconHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.md,
  },
  logoHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.sm,
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  topGroupsGlass: {
    borderRadius: DS.Radius.lg,
    padding: DS.Spacing.md,
    overflow: 'hidden',
  },
  topGroupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.Spacing.md,
  },
  topGroupsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activitiesList: {
    gap: 12,
  },
  activitiesScroll: {
    marginHorizontal: -DS.Spacing.lg,
  },
  activitiesScrollContent: {
    paddingHorizontal: DS.Spacing.lg,
    gap: 16,
  },
  activityCardWrapper: {
    width: 200,
  },
  // Stories Row styles
  storiesContainer: {
    marginBottom: 4,
    marginTop: -16,
  },
  storiesContent: {
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 4,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 114,
  },
  storyItemSkeleton: {
    alignItems: 'center',
    width: 76,
  },
  storyBubbleSkeleton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
  },
  storyLabelSkeleton: {
    width: 50,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A1A1A',
    marginTop: 6,
  },
  addStoryBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addStoryGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStoryBubbleWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStoryOutline: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  storyLabel: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: C.ink2,
    marginTop: 6,
    textAlign: 'center',
  },
  storyCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: C.crimson,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  storyCountText: {
    fontSize: 11,
    fontFamily: F.bold,
    color: C.ink,
  },
  header: {
    paddingHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    marginBottom: 4,
  },
  headerSpacer: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  headerLogo: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F5F0FF',
    letterSpacing: 6,
    textShadowColor: 'rgba(168,85,247,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  campusSubtitle: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: DS.Color.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.gelPurple,
  },
  section: {
    paddingHorizontal: DS.Spacing.lg,
    marginBottom: 28,
  },
  sectionLabel: {
    color: DS.Color.text3,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: DS.Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: DS.Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.Spacing.md,
  },
  sectionTitle: {
    color: C.ink,
    fontSize: 22,
    fontFamily: F.bold,
    letterSpacing: -0.5,
  },
  sectionLabel2: {
    color: C.ink3,
    fontSize: 11,
    fontFamily: F.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionTitle2: {
    color: C.ink,
    fontSize: 22,
    fontFamily: F.bold,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statCardGlass: {
    flex: 1,
    alignItems: 'center',
    padding: DS.Spacing.md,
    borderRadius: DS.Radius.lg,
  },
  statNumber: {
    color: DS.Color.text,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 8,
  },
  statNumberGlass: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
    marginTop: 8,
  },
  statLabel: {
    color: DS.Color.text3,
    fontSize: 11,
    marginTop: 2,
  },
  statLabelGlass: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: DS.Color.divider,
    marginHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.xl,
  },
  dividerWrapper: {
    paddingHorizontal: DS.Spacing.lg,
    marginBottom: DS.Spacing.xl,
  },
  gradientDivider: {
    height: 1,
  },
  groupCard: {
    width: 200,
    height: 256,
    marginRight: 14,
    borderRadius: DS.Radius.xl,
    overflow: 'hidden',
    borderWidth: DS.Stroke.hairline,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: DS.Color.glass,
  },
  groupCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 6,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  groupCardName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  groupCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupCardMetaText: {
    color: 'rgba(255, 255, 255, 0.80)',
    fontSize: 11,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: C.ink2,
    fontSize: 13,
    fontFamily: F.semibold,
  },
  loadingContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardGradient: {
    borderRadius: DS.Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 8,
  },
  activityCardInner: {
    backgroundColor: 'transparent',
    borderRadius: DS.Radius.lg,
    padding: DS.Spacing.md,
    height: 190,
  },
  activityCard: {
    padding: DS.Spacing.sm,
    borderRadius: DS.Radius.md,
    height: 180,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.Spacing.sm,
  },
  activityCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityCategoryText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activityDurationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityDurationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  activityDuration: {
    color: DS.Color.text2,
    fontSize: 11,
  },
  activityName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
  },
  activityDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: DS.Spacing.sm,
    flex: 1,
  },
  activityFooter: {
    marginTop: 'auto',
  },
  activityEnergySection: {
    marginBottom: DS.Spacing.sm,
  },
  activityEnergyLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  energyDots: {
    flexDirection: 'row',
    gap: 3,
  },
  energyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityTagText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  activityTag21: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityTag21Text: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '700',
  },
  seeAllActivitiesButton: {
    marginTop: DS.Spacing.md,
    backgroundColor: DS.Color.glass,
    borderRadius: DS.Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  seeAllActivitiesText: {
    color: DS.Color.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  stepsContainer: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: DS.Color.text,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  stepSubtitle: {
    color: DS.Color.text2,
    fontSize: 13,
    lineHeight: 19,
  },
  // CTA Section styles
  ctaCard: {
    padding: DS.Spacing.xl,
    borderRadius: DS.Radius.lg,
  },
  ctaContent: {
    alignItems: 'center',
    marginBottom: DS.Spacing.lg,
  },
  ctaIconContainer: {
    marginBottom: DS.Spacing.md,
  },
  ctaIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DS.Color.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: DS.Color.text2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: DS.Spacing.md,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DS.Radius.md,
    backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.Color.text,
  },
  ctaButtonPrimary: {
    flex: 1,
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  ctaButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
