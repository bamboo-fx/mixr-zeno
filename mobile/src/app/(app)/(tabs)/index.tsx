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
  clubs:  ['#A78BFA', '#7C3AED'],
  other:  ['#9CA3AF', '#6B7280'],
};

const ACTIVITY_COLORS: Record<ActivityCategory, string[]> = {
  drinking_game: ['#FF6B6B', '#FF8E53'],
  icebreaker: ['#00D4AA', '#0096FF'],
  competition: ['#A78BFA', '#7C3AED'],
  themed: ['#EC4899', '#A855F7'],
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
                <Plus size={14} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          ) : (
            // No story - show Add button
            <Pressable
              onPress={() => {
                Haptics.tap();
                onCameraPress();
              }}
              style={{ marginTop: 10 }}
            >
              <Image
                source={ADD_STORY_BUTTON}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            </Pressable>
          )}
          {myStory ? (
            <Text style={styles.storyLabel} numberOfLines={1}>Your Story</Text>
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginTop: 2 }}>Add Story</Text>
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
  const colors = CATEGORY_COLORS[group.category] ?? ['#A78BFA', '#7C3AED'];

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
    <View style={{ flex: 1, backgroundColor: '#211621' }}>
    <GelBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" progressViewOffset={38} />
        }
      >
        {/* Logo Header */}
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: DS.Spacing.lg, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Image
                source={MIXR_LOGO}
                style={{ width: 160, height: 40 }}
                resizeMode="contain"
              />
            </View>
            <MessagesButton onPress={() => router.push('/notifications')} />
          </View>
        </View>

        {/* Stories Row */}
        <StoriesRow
          stories={storiesFeed}
          isLoading={storiesLoading}
          onStoryPress={handleStoryPress}
          onCameraPress={handleCameraPress}
          currentUserId={profile?.id}
          seenUserIds={seenUserIds}
        />

        {/* Open Mixers Section — individual cards */}
        <View style={styles.section}>
          {/* Section header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={OPEN_MIXERS_GLOBE} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>Open Mixers</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.tap();
                router.push('/create-open-mixer');
              }}
            >
              <Image source={OPEN_MIXERS_POST_BTN} style={{ width: 90, height: 40 }} resizeMode="contain" />
            </Pressable>
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
                    borderBottomColor: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Text style={{
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                    fontSize: 12,
                    fontWeight: isActive ? '600' : '400',
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
                  gap: 8,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 16,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}>
                  <Globe size={24} color="rgba(255,255,255,0.18)" strokeWidth={1.5} />
                  <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '500' }}>
                    No mixers for this period
                  </Text>
                  <Pressable
                    onPress={() => { Haptics.tap(); router.push('/create-open-mixer'); }}
                    style={{
                      marginTop: 4,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 100,
                      backgroundColor: 'rgba(168,85,247,0.18)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(168,85,247,0.40)',
                    }}
                  >
                    <Text style={{ color: DS.Color.gelPurple, fontSize: 13, fontWeight: '700' }}>Post a Mixer</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View style={{ gap: 12 }}>
                {filteredMixers.map((mixer) => {
                  const count = mixer._count?.participants ?? 0;
                  const fillPct = Math.min(count / mixer.maxCapacity, 1);
                  const isFull = count >= mixer.maxCapacity;
                  const isJoined = mixer.isParticipant || mixer.hostId === profile?.id;
                  const isLive = mixer.status === 'live';
                  const bgEntry = BACKGROUND_IMAGES.find((b) => b.key === mixer.backgroundImage) ?? BACKGROUND_IMAGES[0]!;
                  const scheduledDate = new Date(mixer.scheduledStart);
                  const dateTimeStr = scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    + ' • ' + scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                  return (
                    <View
                      key={mixer.id}
                      style={{
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: 'rgba(168,85,247,0.35)',
                        overflow: 'hidden',
                        backgroundColor: 'transparent',
                      }}
                    >
                    <Pressable
                      onPress={() => { Haptics.tap(); router.push(`/open-mixer/${mixer.id}`); }}
                      style={{ borderRadius: 18, overflow: 'hidden', height: 180 }}
                    >
                      {/* Background image */}
                      <Image
                        source={bgEntry.source}
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      {/* Dark scrim — top and bottom for text legibility */}
                      <LinearGradient
                        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', inset: 0 }}
                      />

                      {/* LIVE badge */}
                      {isLive && (
                        <View style={{
                          position: 'absolute', top: 12, right: 12,
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingHorizontal: 10, paddingVertical: 4,
                          borderRadius: 100,
                          backgroundColor: 'rgba(168,85,247,0.80)',
                          borderWidth: 1, borderColor: 'rgba(168,85,247,0.9)',
                        }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>LIVE</Text>
                        </View>
                      )}

                      {/* Top-left title + metrics */}
                      <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        paddingTop: 14, paddingBottom: 14, paddingLeft: 20, paddingRight: 14, gap: 6,
                      }}>
                        {/* Title */}
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: 26,
                          fontWeight: '900',
                          letterSpacing: 0.4,
                          textShadowColor: 'rgba(0,0,0,0.7)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 5,
                        }} numberOfLines={2}>
                          {mixer.title.toUpperCase()}
                        </Text>

                        {/* Metrics row: location • date • time */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <MapPin size={12} color="rgba(255,255,255,0.85)" />
                          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {mixer.location}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}> • </Text>
                          <Calendar size={12} color="rgba(255,255,255,0.85)" />
                          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>
                            {dateTimeStr}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom content */}
                      <View style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: 14, gap: 8,
                      }}>

                        {/* Progress bar + Join button */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* Glassmorphic progress bar */}
                          <View style={{ flex: 1, gap: 5 }}>
                            {/* Outer track */}
                            <View style={{
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: 'rgba(255,255,255,0.08)',
                              borderWidth: 1.5,
                              borderColor: 'rgba(255,255,255,0.18)',
                              padding: 3,
                              justifyContent: 'center',
                            }}>
                              {/* Inner track groove */}
                              <View style={{
                                flex: 1,
                                borderRadius: 8,
                                backgroundColor: 'rgba(0,0,0,0.25)',
                                overflow: 'visible',
                              }}>
                                {/* Gradient fill pill */}
                                {fillPct > 0 && (
                                  <View style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0, left: 0,
                                    width: `${Math.round(fillPct * 100)}%` as any,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                  }}>
                                    <LinearGradient
                                      colors={isFull ? ['#F59E0B', '#F59E0B'] : ['#5BC4EF', '#9B70D6', '#C472C8']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 0 }}
                                      style={{ flex: 1 }}
                                    />
                                    {/* Top gloss highlight */}
                                    <LinearGradient
                                      colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.0)']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0,
                                        height: '50%',
                                        borderTopLeftRadius: 8,
                                        borderTopRightRadius: 8,
                                      }}
                                    />
                                  </View>
                                )}
                                {/* Thumb ball at the end of fill */}
                                {fillPct > 0 && fillPct < 1 && (
                                  <View style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: `${Math.round(fillPct * 100)}%` as any,
                                    width: 14,
                                    height: 14,
                                    borderRadius: 7,
                                    marginTop: -7,
                                    marginLeft: -7,
                                    backgroundColor: 'rgba(200,190,220,0.85)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.6)',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 3,
                                  }} />
                                )}
                              </View>
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '600' }}>
                              {count}/{mixer.maxCapacity} {isFull ? '· Full' : 'joined'}
                            </Text>
                          </View>

                          {/* Join / Joined glassmorphic button */}
                          <Pressable
                            onPress={(e) => { e.stopPropagation(); Haptics.tap(); router.push(`/open-mixer/${mixer.id}`); }}
                            style={{ borderRadius: 100, overflow: 'hidden' }}
                          >
                            <LinearGradient
                              colors={['#5BC4EF', '#9B70D6', '#C472C8']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{
                                paddingHorizontal: 28,
                                paddingVertical: 12,
                                borderRadius: 100,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.15)',
                              }}
                            >
                              <Text style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: '700',
                                letterSpacing: 0.2,
                              }}>
                                {isJoined ? 'Joined ✓' : 'Join'}
                              </Text>
                            </LinearGradient>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>

        {/* Top Mixer of the Week */}
        {(topMixerData?.topMixer || topMixerLoading) && (
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

    </GelBackground>
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
    borderColor: DS.Color.gelPurple,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.Color.gelPurple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DS.Color.bg,
  },
  storyLabel: {
    fontSize: 11,
    color: DS.Color.text2,
    marginTop: 6,
    textAlign: 'center',
  },
  storyCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: DS.Color.gelPurple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  storyCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionLabel2: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionTitle2: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    color: DS.Color.gelPurple,
    fontSize: 13,
    fontWeight: '600',
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
