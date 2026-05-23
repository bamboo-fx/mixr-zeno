import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import type { GroupLeaderboardEntry } from '@/lib/api';
import type { Group, GroupCategory } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  Star,
  Clock,
  UsersRound,
  BarChart2,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Search,
  Trophy,
  Flame,
} from 'lucide-react-native';
import { NotificationBell } from '@/components/NotificationBell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonCard } from '@/components/Skeleton';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';

const CATEGORY_COLORS: Record<string, [string, string]> = {
  sports: ['#FF6B6B', '#FF8E53'],
  social: ['#00D4AA', '#0096FF'],
  clubs: ['#A78BFA', '#7C3AED'],
  other: ['#9CA3AF', '#6B7280'],
};

const ALL_CATEGORIES: { key: GroupCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sports', label: 'Sports' },
  { key: 'social', label: 'Social' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'other', label: 'Other' },
];

type SortOption = 'trending' | 'rating' | 'newest' | 'members' | 'top';

const SORT_OPTIONS: { key: SortOption; label: string; icon: typeof TrendingUp }[] = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'top', label: 'Top Groups', icon: BarChart2 },
  { key: 'rating', label: 'Top Rated', icon: Star },
  { key: 'newest', label: 'Newest', icon: Clock },
  { key: 'members', label: 'Most Members', icon: UsersRound },
];

function GroupCard({ group }: { group: Group }) {
  const memberCount = group._count?.members ?? group.members?.length ?? 0;
  const totalMixers = group.totalMixers ?? 0;
  const catColors = CATEGORY_COLORS[group.category] ?? ['#9CA3AF', '#6B7280'];
  const gradColors: [string, string] = group.color
    ? [group.color, group.color + 'BB']
    : catColors;

  const catLabel =
    ALL_CATEGORIES.find((c) => c.key === group.category)?.label ?? group.category;

  return (
    <GelCard style={{ marginBottom: DS.Spacing.md }}>
      <View style={{ flexDirection: 'row', gap: DS.Spacing.md, alignItems: 'center' }}>
        {/* Letter icon */}
        <LinearGradient
          colors={[gradColors[0] + '55', gradColors[1] + '33']}
          style={{
            width: 56,
            height: 56,
            borderRadius: DS.Radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: DS.Stroke.hairline,
            borderColor: gradColors[0] + '66',
            flexShrink: 0,
          }}
        >
          <Text style={{ color: gradColors[0], fontWeight: '900', fontSize: 22 }}>
            {group.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        {/* Info */}
        <View style={{ flex: 1, gap: 5 }}>
          {/* Name row */}
          <Text
            style={{ color: DS.Color.text, fontWeight: '800', fontSize: 15, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {group.name}
          </Text>

          {/* Category + members row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 100,
                backgroundColor: gradColors[0] + '22',
                borderWidth: 0.5,
                borderColor: gradColors[0] + '55',
              }}
            >
              <Text
                style={{
                  color: gradColors[0],
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {catLabel}
              </Text>
            </View>

            <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: DS.Color.text3 }} />
            <Users size={10} color={DS.Color.text3} />
            <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
              {memberCount.toLocaleString()} members
            </Text>
          </View>

          {/* Mixers + rating row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {totalMixers > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flame size={10} color="#F97316" strokeWidth={1.5} />
                <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
                  {totalMixers} mixer{totalMixers !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {group.avgStarRating != null &&
              (group.totalRatings ?? 0) > 0 && (
                <>
                  {totalMixers > 0 && (
                    <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: DS.Color.text3 }} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
                    <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: '600' }}>
                      {group.avgStarRating.toFixed(1)}
                    </Text>
                  </View>
                </>
              )}
          </View>
        </View>

        <ChevronRight size={16} color={DS.Color.text3} />
      </View>
    </GelCard>
  );
}

function EmptyGroupsState({
  hasFilters,
  onCreateGroup,
}: {
  hasFilters: boolean;
  onCreateGroup: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: DS.Spacing.xl }}>
      <Text style={{ fontSize: 52, marginBottom: DS.Spacing.md }}>👥</Text>
      <Text
        style={{
          color: DS.Color.text,
          fontWeight: '800',
          fontSize: 20,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {hasFilters ? 'No groups found' : 'No groups yet'}
      </Text>
      <Text
        style={{
          color: DS.Color.text2,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: DS.Spacing.xl,
        }}
      >
        {hasFilters
          ? 'Try adjusting your filters or search term'
          : 'Be the first to create a group on campus'}
      </Text>
      {!hasFilters && (
        <Pressable
          onPress={() => { Haptics.medium(); onCreateGroup(); }}
          style={{ borderRadius: DS.Radius.md, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#A855F7', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingHorizontal: 28,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              Create Group
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const CLAREMONT_COLLEGE_IDS = ['hmc01', 'pom01', 'cmc01', 'scr01', 'pit01'];

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  const isClaremont = profile?.collegeId ? CLAREMONT_COLLEGE_IDS.includes(profile.collegeId) : false;
  const collegeIdsToFetch = isClaremont ? CLAREMONT_COLLEGE_IDS : undefined;
  const collegeIdToFetch = !isClaremont ? (profile?.collegeId ?? undefined) : undefined;

  const [query, setQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['groups', isClaremont ? '5c' : profile?.collegeId, collegeIdsToFetch, collegeIdToFetch],
    queryFn: () => api.groups.list({ collegeIds: collegeIdsToFetch, collegeId: collegeIdToFetch }),
    enabled: !!profile,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['groups-leaderboard', profile?.collegeId],
    queryFn: () => api.rankings.getGroupsLeaderboard(profile!.collegeId!),
    enabled: !!profile?.collegeId,
  });
  const leaderboard: GroupLeaderboardEntry[] = leaderboardData?.leaderboard ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredAndSortedGroups = useMemo(() => {
    let result = groups.filter((group: Group) => {
      const matchesSearch =
        query.trim() === '' ||
        group.name.toLowerCase().includes(query.toLowerCase()) ||
        (group.description ?? '').toLowerCase().includes(query.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || group.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    result = [...result].sort((a: Group, b: Group) => {
      const aMemberCount = a._count?.members ?? a.members?.length ?? 0;
      const bMemberCount = b._count?.members ?? b.members?.length ?? 0;

      switch (sortBy) {
        case 'rating':
          return (b.avgStarRating ?? 0) - (a.avgStarRating ?? 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'members':
          return bMemberCount - aMemberCount;
        case 'top':
          return (
            ((b as Group & { mixerCount?: number }).mixerCount ?? 0) -
            ((a as Group & { mixerCount?: number }).mixerCount ?? 0)
          );
        case 'trending':
        default: {
          const aScore = (a.avgStarRating ?? 0) * 0.4 + aMemberCount * 0.6;
          const bScore = (b.avgStarRating ?? 0) * 0.4 + bMemberCount * 0.6;
          return bScore - aScore;
        }
      }
    });

    return result;
  }, [groups, query, selectedCategory, sortBy]);

  const currentSortOption = SORT_OPTIONS.find((o) => o.key === sortBy) ?? SORT_OPTIONS[0];
  const SortIcon = currentSortOption?.icon ?? TrendingUp;
  const hasFilters = query.trim() !== '' || selectedCategory !== 'all';

  return (
    <GelBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DS.Color.gelPurple}
            progressViewOffset={38}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: DS.Spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 34, fontWeight: '900', color: DS.Color.text, letterSpacing: -1 }}>
              Groups
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <NotificationBell onPress={() => router.push('/notifications')} />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: DS.Spacing.lg }}>

          {/* ── LEADERBOARD ─────────────────────────────────────────── */}
          {leaderboard.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Trophy size={14} color="#FBBF24" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: DS.Color.text3,
                      letterSpacing: 1.2,
                    }}
                  >
                    TOP GROUPS
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: DS.Color.text3, fontWeight: '500' }}>
                  Past 4 weeks
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                style={{ flexGrow: 0 }}
              >
                {leaderboard.map((entry) => {
                  const rankColors: Record<number, string> = {
                    1: '#FBBF24',
                    2: '#C0C0C0',
                    3: '#CD7C2F',
                  };
                  const rankColor = rankColors[entry.rank] ?? DS.Color.gelPurple;
                  const stars =
                    entry.avgStarRating != null ? entry.avgStarRating.toFixed(1) : '—';
                  return (
                    <Pressable
                      key={entry.groupId}
                      onPress={() => { Haptics.tap(); router.push(`/group/${entry.groupId}`); }}
                      style={({ pressed }) => ({
                        width: 110,
                        height: 140,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: DS.Color.gelPurple,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(20,15,35,0.85)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: pressed ? 0.82 : 1,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      })}
                    >
                      {/* Background gradient */}
                      <LinearGradient
                        colors={['rgba(168,85,247,0.20)', 'rgba(88,28,220,0.08)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        pointerEvents="none"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 1,
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          zIndex: 2,
                        }}
                      />

                      {/* Letter */}
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          backgroundColor: 'rgba(168,85,247,0.25)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Text style={{ color: '#E9D5FF', fontWeight: '900', fontSize: 22 }}>
                          {entry.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: DS.Color.text,
                          textAlign: 'center',
                          letterSpacing: -0.2,
                          width: '100%',
                          paddingHorizontal: 8,
                        }}
                        numberOfLines={2}
                      >
                        {entry.name}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Star size={9} color="#FBBF24" fill="#FBBF24" />
                        <Text style={{ fontSize: 11, color: DS.Color.text3, fontWeight: '600' }}>
                          {stars}
                        </Text>
                      </View>

                      {/* Rank badge */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 7,
                          left: 7,
                          borderRadius: 8,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          backgroundColor: rankColor,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#000' }}>
                          #{entry.rank}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Create Group Button */}
          <Pressable
            onPress={() => { Haptics.tap(); router.push('/create-group'); }}
            style={({ pressed }) => ({
              marginBottom: DS.Spacing.md,
              borderRadius: DS.Radius.md,
              overflow: 'hidden',
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <LinearGradient
              colors={['rgba(168,85,247,0.22)', 'rgba(124,58,237,0.14)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                height: 46,
                borderRadius: DS.Radius.md,
                borderWidth: DS.Stroke.hairline,
                borderColor: DS.Color.gelPurple,
              }}
            >
              <Plus size={15} color={DS.Color.gelPurple} strokeWidth={2.5} />
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: DS.Color.text, letterSpacing: -0.1 }}
              >
                Create Group
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              height: 40,
              borderRadius: 12,
              backgroundColor: DS.Color.panel,
              paddingHorizontal: 12,
              marginBottom: DS.Spacing.md,
              borderWidth: DS.Stroke.hairline,
              borderColor: DS.Color.stroke,
            }}
          >
            <Search size={15} color={DS.Color.text3} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search groups..."
              placeholderTextColor={DS.Color.text3}
              style={{ flex: 1, fontSize: 15, color: DS.Color.text, fontWeight: '400', paddingVertical: 0 }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={{ padding: 2 }}>
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 9,
                    backgroundColor: DS.Color.text3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={10} color={DS.Color.text} strokeWidth={2.5} />
                </View>
              </Pressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 8, marginBottom: DS.Spacing.md }}
          >
            {ALL_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => { Haptics.tap(); setSelectedCategory(cat.key); }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 100,
                    backgroundColor: isSelected ? 'rgba(168,85,247,0.22)' : DS.Color.panel,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: isSelected ? DS.Color.gelPurple : DS.Color.stroke,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? DS.Color.gelPurple : DS.Color.text2,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sort + Count row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: DS.Spacing.sm,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: DS.Color.text3 }}>
              {filteredAndSortedGroups.length}{' '}
              {filteredAndSortedGroups.length === 1 ? 'group' : 'groups'}
            </Text>

            <Pressable
              onPress={() => { Haptics.tap(); setShowSortMenu(!showSortMenu); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <SortIcon size={13} color={DS.Color.text3} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: DS.Color.text2 }}>
                {currentSortOption?.label}
              </Text>
              <ChevronDown
                size={12}
                color={DS.Color.text3}
                strokeWidth={2}
                style={showSortMenu ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>
          </View>

          {/* Sort Dropdown */}
          {showSortMenu && (
            <GelCard style={{ marginBottom: DS.Spacing.md, padding: 0 }}>
              {SORT_OPTIONS.map((option, idx) => {
                const Icon = option.icon;
                const isActive = sortBy === option.key;
                const isLast = idx === SORT_OPTIONS.length - 1;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => { Haptics.tap(); setSortBy(option.key); setShowSortMenu(false); }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 11,
                      paddingHorizontal: DS.Spacing.md,
                      paddingVertical: 13,
                      borderBottomWidth: isLast ? 0 : 0.5,
                      borderBottomColor: DS.Color.stroke,
                    }}
                  >
                    <Icon
                      size={15}
                      color={isActive ? DS.Color.gelPurple : DS.Color.text3}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? DS.Color.text : DS.Color.text2,
                      }}
                    >
                      {option.label}
                    </Text>
                    {isActive && (
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: DS.Color.gelPurple,
                        }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </GelCard>
          )}

          {/* Active filter chips */}
          {hasFilters && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 7,
                marginBottom: DS.Spacing.sm,
              }}
            >
              {selectedCategory !== 'all' && (
                <Pressable
                  onPress={() => setSelectedCategory('all')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 100,
                    backgroundColor: DS.Color.panel,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: DS.Color.stroke,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: DS.Color.text2 }}>
                    {ALL_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                  </Text>
                  <X size={11} color={DS.Color.text3} />
                </Pressable>
              )}
              {query.trim() !== '' && (
                <Pressable
                  onPress={() => setQuery('')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 100,
                    backgroundColor: DS.Color.panel,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: DS.Color.stroke,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: DS.Color.text2 }}>
                    "{query}"
                  </Text>
                  <X size={11} color={DS.Color.text3} />
                </Pressable>
              )}
            </View>
          )}

          {/* Groups List */}
          {isLoading ? (
            <View style={{ gap: DS.Spacing.sm }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : filteredAndSortedGroups.length === 0 ? (
            <EmptyGroupsState
              hasFilters={hasFilters}
              onCreateGroup={() => router.push('/create-group')}
            />
          ) : (
            <View>
              {filteredAndSortedGroups.map((group: Group, index: number) => (
                <AnimatedListItem key={group.id} index={index}>
                  <Pressable
                    onPress={() => { Haptics.tap(); router.push(`/group/${group.id}`); }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <GroupCard group={group} />
                  </Pressable>
                </AnimatedListItem>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </GelBackground>
  );
}
