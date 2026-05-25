import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { GelBackground, GelCard, } from '@/components/gel';
import type { Group, Activity, GroupCategory } from '@/lib/types';
import {
  X,
  ArrowLeft,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Check,
  ChevronRight,
  Zap,
  MessageSquare,
  Search,
  Star,
  Flame,
  TrendingUp,
  BarChart2,
  Clock,
  UsersRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '@/lib/haptics';
import { MixerDateTimePicker } from '@/components/MixerDateTimePicker';


const CLAREMONT_COLLEGE_IDS = ['hmc01', 'pom01', 'cmc01', 'scr01', 'pit01'];

// ─── Category / sort config (mirrors groups tab) ────────────────────────────

const CATEGORY_COLORS: Record<string, [string, string]> = {
  sports:   ['#FF6B6B', '#FF8E53'],
  social:   ['#00D4AA', '#0096FF'],
  clubs:    ['#4F7CFF', '#28C988'],
  other:    ['#9CA3AF', '#6B7280'],
};

const ALL_CATEGORIES: { key: GroupCategory | 'all'; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'sports', label: 'Sports' },
  { key: 'social', label: 'Social' },
  { key: 'clubs',  label: 'Clubs' },
  { key: 'other',  label: 'Other' },
];

type SortOption = 'trending' | 'rating' | 'newest' | 'members';

const SORT_OPTIONS: { key: SortOption; label: string; icon: typeof TrendingUp }[] = [
  { key: 'trending', label: 'Trending',     icon: TrendingUp },
  { key: 'rating',   label: 'Top Rated',    icon: Star },
  { key: 'newest',   label: 'Newest',       icon: Clock },
  { key: 'members',  label: 'Most Members', icon: UsersRound },
];

// ─── Animated pressable ──────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Category pill (mirrors groups tab) ─────────────────────────────────────

function CategoryPill({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      style={[animStyle, styles.categoryPill, isSelected ? styles.categoryPillSelected : styles.categoryPillUnselected]}
    >
      <Text style={[styles.categoryPillText, isSelected ? styles.categoryPillTextSelected : styles.categoryPillTextUnselected]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Group card (mirrors groups tab GelGroupCard) ────────────────────────────

function GelGroupCard({
  name, category, memberCount, coverUrl, starRating, totalRatings = 0, totalMixers = 0, color,
}: {
  name: string; category: string; memberCount: number; coverUrl?: string | null;
  starRating?: number | null; totalRatings?: number; totalMixers?: number; color?: string | null;
}) {
  const catColors = CATEGORY_COLORS[category] ?? ['#9CA3AF', '#6B7280'];
  const cardColors: [string, string, string] = color
    ? [color, color + 'CC', color + 'BB']
    : [catColors[0], catColors[1], `${catColors[1]}BB`];
  const catLabel = ALL_CATEGORIES.find((c) => c.key === category)?.label ?? category;

  return (
    <View style={styles.groupCardBorder}>
      <LinearGradient colors={cardColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.50)', zIndex: 2 }} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.28)']} start={{ x: 0, y: 0.2 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.groupCardInner}>
        <View style={styles.groupCardContent}>
          <View style={styles.groupCardNameRow}>
            <Text style={styles.groupCardName} numberOfLines={1}>{name}</Text>
            <ChevronRight size={16} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
          </View>
          <View style={styles.groupCategoryBadge}>
            <Text style={styles.groupCategoryLabel}>{catLabel}</Text>
          </View>
          <View style={styles.groupMemberRow}>
            <Users size={11} color="rgba(255,255,255,0.70)" strokeWidth={2} />
            <Text style={styles.groupMemberText}>{memberCount.toLocaleString()} members</Text>
            {totalMixers > 0 && (
              <>
                <View style={styles.groupMemberDot} />
                <Flame size={10} color="#F97316" strokeWidth={1.5} />
                <Text style={styles.groupMemberText}>{totalMixers} mixr{totalMixers !== 1 ? 's' : ''}</Text>
              </>
            )}
            {starRating != null && totalRatings > 0 && (
              <>
                <View style={styles.groupMemberDot} />
                <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
                <Text style={styles.groupMemberText}>{starRating.toFixed(1)}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Shared search + filter header ──────────────────────────────────────────

function GroupsBrowserHeader({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: GroupCategory | 'all';
  onCategoryChange: (c: GroupCategory | 'all') => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
}) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy) ?? SORT_OPTIONS[0]!;
  const SortIcon = currentSort.icon;

  return (
    <View>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={15} color="rgba(235,235,245,0.6)" strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search groups..."
          placeholderTextColor="rgba(235,235,245,0.5)"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQueryChange('')} style={styles.searchClear}>
            <View style={styles.searchClearIcon}>
              <X size={10} color="rgba(0,0,0,0.6)" strokeWidth={2.5} />
            </View>
          </Pressable>
        )}
      </View>

      {/* Category filter card */}
      <View style={styles.categoryCard}>
        <BlurView intensity={55} tint="dark" style={styles.categoryCardBlur}>
          <LinearGradient
            colors={['rgba(168,85,247,0.18)', 'rgba(124,58,237,0.10)', 'rgba(88,28,220,0.14)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill} pointerEvents="none"
          />
          <View style={styles.categoryCardBevel} pointerEvents="none" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.categoryScrollContent}>
            {ALL_CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat.key}
                label={cat.label}
                isSelected={selectedCategory === cat.key}
                onPress={() => { Haptics.tap(); onCategoryChange(cat.key); }}
              />
            ))}
          </ScrollView>
        </BlurView>
      </View>

      {/* Sort row */}
      <View style={styles.sortRow}>
        <Pressable
          onPress={() => { Haptics.tap(); setShowSortMenu((p) => !p); }}
          style={styles.sortButton}
        >
          <SortIcon size={13} color={DS.Color.gelPurple} strokeWidth={2} />
          <Text style={styles.sortButtonText}>{currentSort.label}</Text>
          <ChevronRight
            size={13}
            color={DS.Color.text3}
            style={{ transform: [{ rotate: showSortMenu ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = sortBy === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => { Haptics.tap(); onSortChange(opt.key); setShowSortMenu(false); }}
                style={({ pressed }) => [styles.sortMenuItem, pressed && { opacity: 0.7 }]}
              >
                <Icon size={14} color={isActive ? DS.Color.gelPurple : DS.Color.text3} strokeWidth={2} />
                <Text style={[styles.sortMenuItemText, isActive && { color: DS.Color.gelPurple, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
                {isActive && <Check size={13} color={DS.Color.gelPurple} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type Step = 'my-group' | 'invite-groups' | 'details';

export default function SendMixerRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  // Step state — if a groupId was pre-passed, skip straight to invite step
  const [step, setStep] = useState<Step>(groupIdParam ? 'invite-groups' : 'my-group');

  // Selected groups
  const [requesterGroupId, setRequesterGroupId] = useState<string | null>(groupIdParam ?? null);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);

  // Browser state — shared between both picker steps
  const [myGroupQuery, setMyGroupQuery] = useState('');
  const [myGroupCategory, setMyGroupCategory] = useState<GroupCategory | 'all'>('all');
  const [myGroupSort, setMyGroupSort] = useState<SortOption>('trending');

  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteCategory, setInviteCategory] = useState<GroupCategory | 'all'>('all');
  const [inviteSort, setInviteSort] = useState<SortOption>('trending');

  // Details state
  const [proposedStart, setProposedStart] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [proposedEnd, setProposedEnd] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [surpriseActivity, setSurpriseActivity] = useState(false);
  const [isOpenMixer, setIsOpenMixer] = useState(false);

  // My groups (from profile)
  const myGroupsList: Group[] = useMemo(() =>
    (profile?.groupMemberships ?? []).map((m) => ({
      id: m.groupId,
      name: m.group?.name ?? 'Unknown',
      coverImageUrl: m.group?.coverImageUrl ?? undefined,
      category: (m.group as any)?.category ?? 'other',
      color: (m.group as any)?.color ?? undefined,
      _count: (m.group as any)?._count ?? undefined,
      avgStarRating: (m.group as any)?.avgStarRating ?? null,
      createdAt: (m.group as any)?.createdAt ?? new Date().toISOString(),
      createdById: (m.group as any)?.createdById ?? '',
      collegeId: (m.group as any)?.collegeId ?? '',
      isPrivate: (m.group as any)?.isPrivate ?? false,
      isVerified: (m.group as any)?.isVerified ?? false,
    })),
    [profile]
  );

  // All groups for invite step
  const isClaremont = profile?.collegeId ? CLAREMONT_COLLEGE_IDS.includes(profile.collegeId) : false;
  const { data: allGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', isClaremont ? '5c' : profile?.collegeId, isClaremont, profile?.collegeId],
    queryFn: () => api.groups.list(
      isClaremont
        ? { collegeIds: CLAREMONT_COLLEGE_IDS }
        : { collegeId: profile?.collegeId ?? undefined }
    ),
    enabled: !!profile,
  });

  const { data: requesterGroupDetails } = useQuery({
    queryKey: ['group', requesterGroupId],
    queryFn: () => api.groups.get(requesterGroupId!),
    enabled: !!requesterGroupId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.activities.list(),
  });

  // ── Filtering helpers ──────────────────────────────────────────────────────

  function applyFilter(groups: Group[], query: string, category: GroupCategory | 'all', sort: SortOption): Group[] {
    let result = groups.filter((g) => {
      const matchSearch = !query.trim() || g.name.toLowerCase().includes(query.toLowerCase());
      const matchCat = category === 'all' || g.category === category;
      return matchSearch && matchCat;
    });
    result = [...result].sort((a, b) => {
      const aM = a._count?.members ?? 0;
      const bM = b._count?.members ?? 0;
      switch (sort) {
        case 'rating':   return (b.avgStarRating ?? 0) - (a.avgStarRating ?? 0);
        case 'newest':   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'members':  return bM - aM;
        case 'trending':
        default: return ((b.avgStarRating ?? 0) * 0.4 + bM * 0.6) - ((a.avgStarRating ?? 0) * 0.4 + aM * 0.6);
      }
    });
    return result;
  }

  const filteredMyGroups = useMemo(
    () => applyFilter(myGroupsList, myGroupQuery, myGroupCategory, myGroupSort),
    [myGroupsList, myGroupQuery, myGroupCategory, myGroupSort]
  );

  const filteredInviteGroups = useMemo(() => {
    const selectedIds = new Set(selectedGroups.map((g) => g.id));
    const base = allGroups.filter((g: Group) => g.id !== requesterGroupId && !selectedIds.has(g.id));
    return applyFilter(base, inviteQuery, inviteCategory, inviteSort);
  }, [allGroups, requesterGroupId, selectedGroups, inviteQuery, inviteCategory, inviteSort]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => {
      if (!profile || !requesterGroupId || selectedGroups.length === 0) throw new Error('Missing required data');
      return api.mixerRequests.createMulti({
        collegeId: profile.collegeId ?? '',
        requestingGroupId: requesterGroupId,
        invitedGroupIds: selectedGroups.map((g) => g.id),
        proposedStart: proposedStart.toISOString(),
        proposedEnd: proposedEnd.toISOString(),
        proposedLocation: location.trim() || 'TBD',
        proposedActivityId: surpriseActivity ? undefined : (selectedActivityId ?? undefined),
        surpriseActivity,
        isOpenMixer,
        message: message.trim() || undefined,
        createdById: profile.id,
      });
    },
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] });
      router.back();
    },
    onError: () => { Haptics.error(); },
  });

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // ── Shared header ──────────────────────────────────────────────────────────

  function ScreenHeader({
    title,
    onBack,
    right,
  }: {
    title: string;
    onBack: () => void;
    right?: React.ReactNode;
  }) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + DS.Spacing.sm }]}>
        <Pressable onPress={() => { Haptics.tap(); onBack(); }} style={styles.backButton}>
          <ArrowLeft size={20} color={DS.Color.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Sparkles size={16} color={DS.Color.gelPurple} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={{ minWidth: 60, alignItems: 'flex-end' }}>{right}</View>
      </View>
    );
  }

  // ── STEP 1: Choose your group ──────────────────────────────────────────────

  if (step === 'my-group') {
    return (
      <GelBackground>
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Your Group"
            onBack={() => router.back()}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepHint}>Which group are you sending the request from?</Text>

            <GroupsBrowserHeader
              query={myGroupQuery}
              onQueryChange={setMyGroupQuery}
              selectedCategory={myGroupCategory}
              onCategoryChange={setMyGroupCategory}
              sortBy={myGroupSort}
              onSortChange={setMyGroupSort}
            />

            <View style={styles.cardList}>
              {myGroupsList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Users size={48} color={DS.Color.text3} />
                  <Text style={styles.emptyText}>You're not in any groups yet</Text>
                </View>
              ) : filteredMyGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Users size={48} color={DS.Color.text3} />
                  <Text style={styles.emptyText}>No groups match your search</Text>
                </View>
              ) : (
                filteredMyGroups.map((group) => {
                  const memberCount = group._count?.members ?? 0;
                  return (
                    <AnimatedPressable
                      key={group.id}
                      onPress={() => {
                        Haptics.medium();
                        setRequesterGroupId(group.id);
                        setStep('invite-groups');
                      }}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.groupCardWrapper,
                        pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <GelGroupCard
                        name={group.name}
                        category={group.category ?? 'other'}
                        memberCount={memberCount}
                        coverUrl={group.coverImageUrl}
                        starRating={group.avgStarRating}
                        color={group.color}
                      />
                    </AnimatedPressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </GelBackground>
    );
  }

  // ── STEP 2: Choose groups to invite ───────────────────────────────────────

  if (step === 'invite-groups') {
    return (
      <GelBackground>
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Invite Groups"
            onBack={() => {
              if (groupIdParam) {
                router.back();
              } else {
                setStep('my-group');
              }
            }}
            right={
              selectedGroups.length > 0 ? (
                <Pressable
                  onPress={() => { Haptics.tap(); setStep('details'); }}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <ChevronRight size={16} color={DS.Color.gelPurple} />
                </Pressable>
              ) : undefined
            }
          />

          {/* Requester group pill */}
          {requesterGroupDetails && (
            <View style={styles.fromBanner}>
              <Text style={styles.fromBannerLabel}>From</Text>
              <View style={styles.fromBannerGroup}>
                <Text style={styles.fromBannerName} numberOfLines={1}>{requesterGroupDetails.name}</Text>
              </View>
            </View>
          )}

          {/* Selected groups chips */}
          {selectedGroups.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedLabel}>
                Inviting {selectedGroups.length} {selectedGroups.length === 1 ? 'group' : 'groups'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedChips}>
                {selectedGroups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => { Haptics.tap(); setSelectedGroups((prev) => prev.filter((g) => g.id !== group.id)); }}
                    style={styles.selectedChip}
                  >
                    <Text style={styles.selectedChipText}>{group.name}</Text>
                    <X size={14} color={DS.Color.gelPurple} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <GroupsBrowserHeader
              query={inviteQuery}
              onQueryChange={setInviteQuery}
              selectedCategory={inviteCategory}
              onCategoryChange={setInviteCategory}
              sortBy={inviteSort}
              onSortChange={setInviteSort}
            />

            <View style={styles.cardList}>
              {groupsLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={DS.Color.gelPurple} />
                </View>
              ) : filteredInviteGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Users size={48} color={DS.Color.text3} />
                  <Text style={styles.emptyText}>
                    {inviteQuery ? 'No groups match your search' : 'No other groups available'}
                  </Text>
                </View>
              ) : (
                filteredInviteGroups.map((group: Group) => {
                  const isSelected = selectedGroups.some((g) => g.id === group.id);
                  const memberCount = group._count?.members ?? 0;
                  return (
                    <AnimatedPressable
                      key={group.id}
                      onPress={() => {
                        Haptics.tap();
                        setSelectedGroups((prev) =>
                          isSelected ? prev.filter((g) => g.id !== group.id) : [...prev, group]
                        );
                      }}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.groupCardWrapper,
                        pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <View>
                        <GelGroupCard
                          name={group.name}
                          category={group.category ?? 'other'}
                          memberCount={memberCount}
                          coverUrl={group.coverImageUrl}
                          starRating={group.avgStarRating}
                          totalMixers={(group as any).mixerCount ?? 0}
                          color={group.color}
                        />
                        {/* Selection overlay */}
                        {isSelected && (
                          <View style={styles.selectedOverlay}>
                            <View style={styles.selectedCheckBadge}>
                              <Check size={16} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          </View>
                        )}
                      </View>
                    </AnimatedPressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </GelBackground>
    );
  }

  // ── STEP 3: Details ────────────────────────────────────────────────────────

  return (
    <GelBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScreenHeader
          title="Mixer Details"
          onBack={() => setStep('invite-groups')}
          right={
            requesterGroupId && selectedGroups.length > 0 ? (
              <Pressable onPress={() => { Haptics.medium(); createMutation.mutate(); }} disabled={createMutation.isPending}>
                <LinearGradient
                  colors={[...DS.Grad.gelGlow.colors]}
                  start={DS.Grad.gelGlow.start}
                  end={DS.Grad.gelGlow.end}
                  style={styles.sendButton}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.sendButtonDisabled}>
                <Text style={styles.sendButtonTextDisabled}>Send</Text>
              </View>
            )
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailsContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Invited groups summary */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Inviting</Text>
            <GelCard padding={DS.Spacing.md}>
              <View style={styles.invitedSummary}>
                {selectedGroups.slice(0, 3).map((group, index) => (
                  <View key={group.id} style={[styles.invitedAvatar, { marginLeft: index > 0 ? -12 : 0, zIndex: 10 - index, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#3AE3A0', fontWeight: '900', fontSize: 14 }}>
                      {group.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ))}
                {selectedGroups.length > 3 && (
                  <View style={[styles.invitedAvatar, { marginLeft: -12, backgroundColor: DS.Color.gelPurple, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.invitedMoreText}>+{selectedGroups.length - 3}</Text>
                  </View>
                )}
                <View style={styles.invitedNames}>
                  <Text style={styles.invitedNamesText} numberOfLines={2}>
                    {selectedGroups.map((g) => g.name).join(', ')}
                  </Text>
                </View>
              </View>
            </GelCard>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When *</Text>
            <Text style={styles.startEndLabel}>START</Text>
            <View style={styles.dateTimeRow}>
              <Pressable onPress={() => { Haptics.tap(); setShowDatePicker(true); }} style={styles.dateTimeButton}>
                <Calendar size={16} color={DS.Color.gelPurple} />
                <Text style={styles.dateTimeText}>{formatDate(proposedStart)}</Text>
              </Pressable>
              <Pressable onPress={() => { Haptics.tap(); setShowTimePicker(true); }} style={[styles.dateTimeButton, styles.timeButton]}>
                <Text style={styles.dateTimeText}>{formatTime(proposedStart)}</Text>
              </Pressable>
            </View>
            <Text style={[styles.startEndLabel, { marginTop: 16 }]}>END</Text>
            <View style={styles.dateTimeRow}>
              <Pressable onPress={() => { Haptics.tap(); setShowEndDatePicker(true); }} style={styles.dateTimeButton}>
                <Calendar size={16} color={DS.Color.text3} />
                <Text style={styles.dateTimeText}>{formatDate(proposedEnd)}</Text>
              </Pressable>
              <Pressable onPress={() => { Haptics.tap(); setShowEndTimePicker(true); }} style={[styles.dateTimeButton, styles.timeButton]}>
                <Text style={styles.dateTimeText}>{formatTime(proposedEnd)}</Text>
              </Pressable>
            </View>
            <MixerDateTimePicker visible={showDatePicker} onClose={() => setShowDatePicker(false)} value={proposedStart} onChange={setProposedStart} minimumDate={new Date()} title="Start Date" mode="date" />
            <MixerDateTimePicker visible={showTimePicker} onClose={() => setShowTimePicker(false)} value={proposedStart} onChange={setProposedStart} minimumDate={new Date()} title="Start Time" mode="time" />
            <MixerDateTimePicker visible={showEndDatePicker} onClose={() => setShowEndDatePicker(false)} value={proposedEnd} onChange={setProposedEnd} minimumDate={proposedStart} title="End Date" mode="date" />
            <MixerDateTimePicker visible={showEndTimePicker} onClose={() => setShowEndTimePicker(false)} value={proposedEnd} onChange={setProposedEnd} minimumDate={proposedStart} title="End Time" mode="time" />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where *</Text>
            <GelCard padding={0}>
              <View style={styles.inputRow}>
                <MapPin size={18} color={DS.Color.text3} />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location..."
                  placeholderTextColor={DS.Color.text3}
                  style={styles.textInput}
                />
              </View>
            </GelCard>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Activity (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activitiesRow}>
              <Pressable
                onPress={() => { Haptics.tap(); setSelectedActivityId(null); setSurpriseActivity(false); }}
                style={[styles.activityChip, !selectedActivityId && !surpriseActivity && styles.activityChipSelected]}
              >
                <Zap size={14} color={!selectedActivityId && !surpriseActivity ? '#FFFFFF' : DS.Color.text3} />
                <Text style={[styles.activityChipText, !selectedActivityId && !surpriseActivity && styles.activityChipTextSelected]}>Random</Text>
              </Pressable>
              {/* Surprise — hides the activity until reveal */}
              <Pressable
                onPress={() => { Haptics.tap(); setSurpriseActivity(true); setSelectedActivityId(null); }}
                style={[styles.activityChip, surpriseActivity && styles.activityChipSelected]}
              >
                <Text style={[styles.activityChipText, surpriseActivity && styles.activityChipTextSelected]}>🎁 Surprise</Text>
              </Pressable>
              {activities.slice(0, 6).map((activity: Activity) => {
                const isSel = selectedActivityId === activity.id;
                return (
                  <Pressable
                    key={activity.id}
                    onPress={() => { Haptics.tap(); setSelectedActivityId(isSel ? null : activity.id); setSurpriseActivity(false); }}
                    style={[styles.activityChip, isSel && styles.activityChipSelected]}
                  >
                    <Text style={[styles.activityChipText, isSel && styles.activityChipTextSelected]}>{activity.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Open vs Closed toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mixer Type</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => { Haptics.tap(); setIsOpenMixer(false); }}
                style={[
                  { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1.5 },
                  { backgroundColor: !isOpenMixer ? '#FFFFFF' : 'transparent', borderColor: !isOpenMixer ? '#FFFFFF' : 'rgba(255,255,255,0.18)' },
                ]}
              >
                <Text style={{ color: !isOpenMixer ? '#000' : '#FFF', fontWeight: '700', fontSize: 14 }}>🔒 Closed</Text>
                <Text style={{ color: !isOpenMixer ? '#444' : 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>Invited groups only</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.tap(); setIsOpenMixer(true); }}
                style={[
                  { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1.5 },
                  { backgroundColor: isOpenMixer ? '#FFFFFF' : 'transparent', borderColor: isOpenMixer ? '#FFFFFF' : 'rgba(255,255,255,0.18)' },
                ]}
              >
                <Text style={{ color: isOpenMixer ? '#000' : '#FFF', fontWeight: '700', fontSize: 14 }}>🌐 Open</Text>
                <Text style={{ color: isOpenMixer ? '#444' : 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>Other groups can join</Text>
              </Pressable>
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message (Optional)</Text>
            <GelCard padding={0}>
              <View style={styles.messageInputRow}>
                <MessageSquare size={18} color={DS.Color.text3} />
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Add a note to your request..."
                  placeholderTextColor={DS.Color.text3}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.messageInput}
                  maxLength={200}
                />
              </View>
            </GelCard>
            <Text style={styles.charCount}>{message.length}/200</Text>
          </View>

          {createMutation.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Failed to send request. Please try again.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GelBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: DS.Spacing.md,
    borderBottomWidth: DS.Stroke.hairline,
    borderBottomColor: DS.Color.stroke,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: DS.Color.glass,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: DS.Stroke.hairline, borderColor: DS.Color.stroke,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.Color.text, letterSpacing: -0.3 },

  // Step hint
  stepHint: {
    fontSize: 14,
    color: DS.Color.text3,
    marginBottom: DS.Spacing.lg,
    marginTop: DS.Spacing.sm,
  },

  // Next / send buttons
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: DS.Color.gelPurple },
  sendButton: {
    paddingHorizontal: DS.Spacing.lg, paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl, minWidth: 70, alignItems: 'center',
  },
  sendButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  sendButtonDisabled: {
    paddingHorizontal: DS.Spacing.lg, paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.xl, backgroundColor: DS.Color.glass, minWidth: 70, alignItems: 'center',
  },
  sendButtonTextDisabled: { color: DS.Color.text3, fontWeight: '700', fontSize: 14 },

  // From banner (step 2)
  fromBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.sm,
    borderBottomWidth: DS.Stroke.hairline,
    borderBottomColor: DS.Color.stroke,
  },
  fromBannerLabel: { fontSize: 12, fontWeight: '700', color: DS.Color.text3, textTransform: 'uppercase', letterSpacing: 0.6 },
  fromBannerGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  fromBannerName:{ fontSize: 14, fontWeight: '600', color: DS.Color.text, flex: 1 },

  // Selected chips
  selectedSection: { paddingHorizontal: DS.Spacing.lg, paddingTop: DS.Spacing.sm, paddingBottom: DS.Spacing.sm },
  selectedLabel: { fontSize: 13, fontWeight: '700', color: DS.Color.gelPurple, marginBottom: DS.Spacing.sm },
  selectedChips: { flexDirection: 'row', gap: 8 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100,
    backgroundColor: DS.Color.gelPurple + '20',
    borderWidth: 1, borderColor: DS.Color.gelPurple + '40',
  },
  selectedChipText: { fontSize: 13, fontWeight: '600', color: DS.Color.gelPurple },

  // List
  listContent: { paddingHorizontal: DS.Spacing.lg, paddingTop: DS.Spacing.md },
  cardList: { gap: 10, marginTop: DS.Spacing.md },
  groupCardWrapper: {},

  // Search bar (mirrors groups tab)
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(118,118,128,0.24)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    gap: 6, marginBottom: DS.Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: DS.Color.text },
  searchClear: { padding: 2 },
  searchClearIcon: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(235,235,245,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Category card (mirrors groups tab)
  categoryCard: { borderRadius: 14, overflow: 'hidden', marginBottom: DS.Spacing.sm },
  categoryCardBlur: { borderRadius: 14, overflow: 'hidden' },
  categoryCardBevel: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)', zIndex: 1,
  },
  categoryScrollContent: { paddingHorizontal: DS.Spacing.md, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  categoryPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1,
  },
  categoryPillSelected: {
    backgroundColor: DS.Color.gelPurple,
    borderColor: DS.Color.gelPurple,
    shadowColor: DS.Color.gelPurple, shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  categoryPillUnselected: { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)' },
  categoryPillText: { fontSize: 13, fontWeight: '600' },
  categoryPillTextSelected: { color: '#FFFFFF' },
  categoryPillTextUnselected: { color: 'rgba(235,235,245,0.75)' },

  // Sort
  sortRow: { flexDirection: 'row', marginBottom: DS.Spacing.sm },
  sortButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.hairline, borderColor: DS.Color.stroke,
  },
  sortButtonText: { fontSize: 13, fontWeight: '600', color: DS.Color.text2 },
  sortMenu: {
    backgroundColor: DS.Color.panel, borderRadius: 12,
    borderWidth: DS.Stroke.hairline, borderColor: DS.Color.stroke,
    marginBottom: DS.Spacing.sm, overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: DS.Spacing.md, paddingVertical: 12,
    borderBottomWidth: DS.Stroke.hairline, borderBottomColor: DS.Color.stroke,
  },
  sortMenuItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: DS.Color.text2 },

  // GelGroupCard (mirrors groups tab)
  groupCardBorder: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  groupCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  groupCardContent: { flex: 1, gap: 5 },
  groupCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupCardName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  groupCategoryBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.25)',
  },
  groupCategoryLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize' },
  groupMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupMemberText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.70)' },
  groupMemberDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.40)' },

  // Selection overlay on invite cards
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.25)',
    borderWidth: 2, borderColor: DS.Color.gelPurple,
  },
  selectedCheckBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: DS.Color.gelPurple,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.Color.gelPurple, shadowOpacity: 0.6, shadowRadius: 8,
  },

  // Empty state
  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: DS.Color.text3, textAlign: 'center' },

  // Details
  detailsContent: { paddingHorizontal: DS.Spacing.lg, paddingTop: DS.Spacing.xl },
  section: { marginBottom: DS.Spacing.xl },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: DS.Color.text3,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: DS.Spacing.sm,
  },
  invitedSummary: { flexDirection: 'row', alignItems: 'center' },
  invitedAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: DS.Color.panel, overflow: 'hidden' },
  invitedMoreText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  invitedNames: { flex: 1, marginLeft: DS.Spacing.md },
  invitedNamesText: { fontSize: 14, fontWeight: '600', color: DS.Color.text },
  startEndLabel: {
    fontSize: 11, fontWeight: '700', color: DS.Color.text3,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeButton: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: DS.Radius.md,
    backgroundColor: DS.Color.glass, borderWidth: 1, borderColor: DS.Color.stroke,
  },
  timeButton: { flex: 1 },
  dateTimeText: { fontSize: 15, fontWeight: '600', color: DS.Color.text },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg, paddingVertical: 14,
  },
  textInput: { flex: 1, fontSize: 15, color: DS.Color.text },
  activitiesRow: { flexDirection: 'row', gap: 10 },
  activityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100,
    backgroundColor: DS.Color.glass, borderWidth: 1, borderColor: DS.Color.stroke,
  },
  activityChipSelected: { backgroundColor: DS.Color.gelPurple + '20', borderColor: DS.Color.gelPurple },
  activityChipText: { fontSize: 13, fontWeight: '600', color: DS.Color.text2 },
  activityChipTextSelected: { color: DS.Color.gelPurple, fontWeight: '700' },
  messageInputRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: DS.Spacing.sm,
    paddingHorizontal: DS.Spacing.lg, paddingVertical: 14,
  },
  messageInput: { flex: 1, fontSize: 15, color: DS.Color.text, minHeight: 60 },
  charCount: { fontSize: 11, color: DS.Color.text3, textAlign: 'right', marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: DS.Radius.md,
    padding: DS.Spacing.md, borderWidth: DS.Stroke.hairline, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});
