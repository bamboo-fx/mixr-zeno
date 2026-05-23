import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Sparkles,
  Shield,
  CheckCircle2,
  Settings,
  ClipboardList,
  ChevronRight,
  Star,
  Calendar,
  MapPin,
  Clock,
  Bell,
  Lock,
  Globe,
  Camera,
} from 'lucide-react-native';
import type { GroupCategory, GroupMember, GroupHighlight, Mixer } from '@/lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HighlightsRow } from '@/components/highlights/HighlightsRow';
import { HighlightViewer } from '@/components/highlights/HighlightViewer';
import { GelBackground, GelCard } from '@/components/gel';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { InviteMembersModal } from '@/components/invites/InviteMembersModal';

const CATEGORY_COLORS: Record<GroupCategory, string> = {
  sports: '#FF6B6B',
  social: '#A78BFA',
  clubs:  '#4ECDC4',
  other:  '#94A3B8',
};

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<boolean>(false);

  const { data: group, isLoading, refetch } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.groups.get(id),
    enabled: !!id,
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['group-join-requests', id],
    queryFn: () => api.groups.getJoinRequests(id),
    enabled: !!id && (group?.members?.some((m) => m.userId === profile?.id && (m.role === 'social_chair' || m.role === 'admin')) ?? false),
  });

  // Check if current user has a pending join request (for private groups)
  const { data: myJoinRequestData } = useQuery({
    queryKey: ['my-join-request', id, profile?.id],
    queryFn: () => api.groups.getMyJoinRequest(id, profile!.id),
    enabled: !!id && !!profile?.id && !(group?.members?.some((m) => m.userId === profile?.id) ?? false) && (group?.isPrivate ?? false),
  });

  const hasPendingRequest = myJoinRequestData?.hasPendingRequest ?? false;

  // Fetch group highlights
  const { data: highlights = [] } = useQuery({
    queryKey: ['group-highlights', id],
    queryFn: () => api.highlights.getForGroup(id),
    enabled: !!id,
  });

  // Fetch past mixers for this group
  const { data: mixers = [] } = useQuery({
    queryKey: ['group-mixers', id],
    queryFn: () => api.mixers.list({ groupId: id }),
    enabled: !!id,
  });

  // Highlight viewer state
  const [highlightViewerVisible, setHighlightViewerVisible] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<GroupHighlight | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Get notification count for bell icon
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['notification-count', profile?.id],
    queryFn: () => api.notifications.getUnreadCount(profile!.id),
    enabled: !!profile?.id,
  });

  const handleHighlightPress = (highlight: GroupHighlight) => {
    setSelectedHighlight(highlight);
    setHighlightViewerVisible(true);
  };

  const handleCreateHighlight = () => {
    Haptics.tap();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const isMember = group?.members?.some((m) => m.userId === profile?.id) ?? false;
  const userMember = group?.members?.find((m) => m.userId === profile?.id);
  const userRole = userMember?.role;
  const isSocialChair = userRole === 'social_chair' || userRole === 'admin';
  const isAdmin = userRole === 'admin';
  const memberCount = group?._count?.members ?? group?.members?.length ?? 0;
  const catColor = group ? CATEGORY_COLORS[group.category] : '#94A3B8';

  const displayedMembers = group?.members?.slice(0, 6) ?? [];
  const hasMoreMembers = (group?.members?.length ?? 0) > 6;

  const handlePickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0] && profile) {
      setUploadingCover(true);
      try {
        await api.groups.update(id, {
          requesterId: profile.id,
          coverImageUrl: result.assets[0].uri,
        });
        Haptics.success();
        queryClient.invalidateQueries({ queryKey: ['group', id] });
      } catch {
        Haptics.error();
        Alert.alert('Error', 'Failed to update group photo. Please try again.');
      } finally {
        setUploadingCover(false);
      }
    }
  };

  // Filter past/completed mixers
  const pastMixers = mixers.filter((m: Mixer) => m.status === 'completed');
  const upcomingMixers = mixers.filter((m: Mixer) => m.status === 'upcoming' || m.status === 'locked');

  const joinMutation = useMutation({
    mutationFn: async () => {
      // For private groups, create a join request instead of direct join
      if (group?.isPrivate) {
        await api.groups.requestJoin(id, profile!.id);
      } else {
        await api.groups.join(id, profile!.id);
      }
    },
    onSuccess: async () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-join-request', id, profile?.id] });
      // Refresh profile to update groupMemberships (only for public groups that join immediately)
      if (!group?.isPrivate && profile?.id) {
        const updatedProfile = await api.profiles.get(profile.id);
        setProfile(updatedProfile);
      }
    },
    onError: () => {
      Haptics.error();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.groups.leave(id, profile!.id),
    onSuccess: async () => {
      Haptics.warning();
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Refresh profile to update groupMemberships
      if (profile?.id) {
        const updatedProfile = await api.profiles.get(profile.id);
        setProfile(updatedProfile);
      }
    },
  });

  const pendingCount = joinRequests.filter((r) => r.status === 'pending').length;

  if (isLoading) {
    return (
      <GelBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DS.Color.gelPurple} />
        </View>
      </GelBackground>
    );
  }

  if (!group) {
    return (
      <GelBackground>
        <View style={styles.emptyContainer}>
          <Users size={48} color={DS.Color.text3} />
          <Text style={styles.emptyTitle}>Group not found</Text>
          <Pressable onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Go back</Text>
          </Pressable>
        </View>
      </GelBackground>
    );
  }

  return (
    <GelBackground>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DS.Color.gelPurple}
          />
        }
      >
        {/* Hero section */}
        <View style={styles.heroSection}>
          {group.coverImageUrl ? (
            <Image
              source={{ uri: group.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[catColor + '60', catColor + '30', DS.Color.bg]}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Gradient fade */}
          <LinearGradient
            colors={['rgba(11,12,16,0.15)', 'rgba(11,12,16,0.5)', DS.Color.bg]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => {
                Haptics.tap();
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Notification bell */}
          <View style={[styles.notificationButtonContainer, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => {
                Haptics.tap();
                router.push('/notifications');
              }}
              style={styles.notificationButton}
            >
              <Bell size={20} color="#FFFFFF" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Admin: edit cover photo button (top-right, below notification bell) */}
          {isAdmin && (
            <View style={[styles.editCoverButtonContainer, { top: insets.top + 58 }]}>
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  handlePickCoverImage();
                }}
                style={styles.editCoverButton}
                disabled={uploadingCover}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          )}

          {/* Category + verified + privacy badges */}
          <View style={styles.heroBadges}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
              <Text style={styles.categoryBadgeText}>{group.category}</Text>
            </View>
            {group.isPrivate ? (
              <View style={styles.privateBadge}>
                <Lock size={12} color={DS.Color.text2} />
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            ) : (
              <View style={styles.publicBadge}>
                <Globe size={12} color={DS.Color.text3} />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}
            {group.isVerified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color={DS.Color.success} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Group info */}
        <View style={styles.infoSection}>
          <Text style={styles.groupName}>{group.name}</Text>

          <View style={styles.statsRow}>
            <Users size={15} color={DS.Color.text3} />
            <Text style={styles.statsText}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
            {group.avgStarRating !== undefined && group.avgStarRating !== null && (group.totalRatings ?? 0) > 0 && (
              <>
                <Text style={styles.statsDot}>·</Text>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingText}>{group.avgStarRating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({group.totalRatings})</Text>
              </>
            )}
          </View>

          {group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}

          {/* Membership status */}
          {isMember && (
            <View style={styles.membershipBadge}>
              <Shield size={17} color={DS.Color.success} />
              <Text style={styles.membershipText}>
                {isSocialChair
                  ? userRole === 'admin'
                    ? 'You are an Admin'
                    : 'You are a Social Chair'
                  : 'You are a member'}
              </Text>
            </View>
          )}
        </View>

        {/* Admin Management Section */}
        {isSocialChair && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management</Text>
            <GelCard padding={0}>
              {/* Invite Members (In-app) */}
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  setInviteModalVisible(true);
                }}
                style={styles.managementRow}
              >
                <View style={[styles.managementIcon, { backgroundColor: 'rgba(255,255,255,0.07)' }]}>
                  <UserPlus size={18} color={DS.Color.text2} />
                </View>
                <View style={styles.managementContent}>
                  <Text style={styles.managementTitle}>Invite Members</Text>
                  <Text style={styles.managementSubtext}>Search and invite people</Text>
                </View>
                <ChevronRight size={18} color={DS.Color.text3} />
              </Pressable>
              <View style={styles.managementDivider} />

              {/* Manage Join Requests */}
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  router.push(`/manage-join-requests?groupId=${id}`);
                }}
                style={styles.managementRow}
              >
                <View style={styles.managementIcon}>
                  <ClipboardList size={18} color={DS.Color.text2} />
                </View>
                <View style={styles.managementContent}>
                  <Text style={styles.managementTitle}>Join Requests</Text>
                  {pendingCount > 0 && (
                    <Text style={styles.managementSubtext}>{pendingCount} pending</Text>
                  )}
                </View>
                <View style={styles.managementRight}>
                  {pendingCount > 0 && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                    </View>
                  )}
                  <ChevronRight size={18} color={DS.Color.text3} />
                </View>
              </Pressable>
            </GelCard>
          </View>
        )}

        {/* Members Section - Now at top */}
        {(group?.members?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members</Text>
              <Text style={styles.sectionCount}>{memberCount}</Text>
            </View>
            <View style={styles.membersListContainer}>
              {(group?.members ?? []).map((member: GroupMember) => {
                const roleBadgeColor =
                  member.role === 'admin'
                    ? DS.Color.gelPurple
                    : member.role === 'social_chair'
                    ? DS.Color.success
                    : null;
                const roleLabel =
                  member.role === 'admin'
                    ? 'Admin'
                    : member.role === 'social_chair'
                    ? 'Social Chair'
                    : null;

                return (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      Haptics.tap();
                      if (member.userId) {
                        router.push(`/user/${member.userId}`);
                      }
                    }}
                  >
                    <GelCard padding={DS.Spacing.md}>
                      <View style={styles.memberCardNew}>
                        {member.user?.avatarUrl ? (
                          <Image
                            source={{ uri: member.user.avatarUrl }}
                            style={styles.memberAvatarNew}
                          />
                        ) : (
                          <LinearGradient
                            colors={['#2A2A2A', '#1A1A1A']}
                            style={styles.memberAvatarFallbackNew}
                          >
                            <Text style={styles.memberAvatarTextNew}>
                              {getInitials(member.user?.name)}
                            </Text>
                          </LinearGradient>
                        )}
                        <View style={styles.memberInfoNew}>
                          <Text style={styles.memberNameNew} numberOfLines={1}>
                            {member.user?.name ?? 'Unknown'}
                          </Text>
                          <View style={styles.memberMetaRow}>
                            {member.user?.yearInSchool && (
                              <Text style={styles.memberYearNew}>
                                {member.user.yearInSchool}
                              </Text>
                            )}
                            {member.user?.college?.name && (
                              <Text style={styles.memberCollegeNew} numberOfLines={1}>
                                {member.user.college.name}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.memberRightSection}>
                          {roleLabel && roleBadgeColor && (
                            <View style={[styles.roleBadgeNew, { backgroundColor: roleBadgeColor + '20', borderColor: roleBadgeColor + '40' }]}>
                              <Text style={[styles.roleBadgeTextNew, { color: roleBadgeColor }]}>
                                {roleLabel}
                              </Text>
                            </View>
                          )}
                          <ChevronRight size={18} color={DS.Color.text3} />
                        </View>
                      </View>
                    </GelCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Upcoming Mixers - Date only, no location */}
        {upcomingMixers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Calendar size={16} color={DS.Color.text3} />
                <Text style={styles.sectionTitle}>Upcoming Mixers</Text>
              </View>
              <Text style={styles.sectionCount}>{upcomingMixers.length}</Text>
            </View>
            <View style={styles.upcomingMixersList}>
              {upcomingMixers.map((mixer: Mixer) => {
                const otherGroup = mixer.groupAId === id ? mixer.groupB : mixer.groupA;
                return (
                  <Pressable
                    key={mixer.id}
                    onPress={() => {
                      Haptics.tap();
                      router.push(`/mixer/${mixer.id}`);
                    }}
                  >
                    <GelCard padding={DS.Spacing.md}>
                      <View style={styles.upcomingMixerCard}>
                        <View style={styles.upcomingMixerLeft}>
                          <View style={styles.upcomingMixerDateBox}>
                            <Text style={styles.upcomingMixerMonth}>
                              {new Date(mixer.scheduledStart).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                            </Text>
                            <Text style={styles.upcomingMixerDay}>
                              {new Date(mixer.scheduledStart).getDate()}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.upcomingMixerContent}>
                          <View style={styles.upcomingMixerHeader}>
                            <Text style={styles.upcomingMixerTitle} numberOfLines={1}>
                              vs {otherGroup?.name ?? 'TBD'}
                            </Text>
                            <View style={[styles.upcomingMixerStatus, mixer.status === 'locked' && styles.upcomingMixerStatusLocked]}>
                              <Text style={[styles.upcomingMixerStatusText, mixer.status === 'locked' && styles.upcomingMixerStatusTextLocked]}>
                                {mixer.status === 'locked' ? 'Locked' : 'Upcoming'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.upcomingMixerTime}>
                            <Clock size={12} color={DS.Color.text3} />
                            <Text style={styles.upcomingMixerTimeText}>
                              {formatTime(mixer.scheduledStart)}
                            </Text>
                            {mixer.activity && (
                              <>
                                <Text style={styles.upcomingMixerDot}>·</Text>
                                <Sparkles size={12} color={DS.Color.pinkSparkle} />
                                <Text style={styles.upcomingMixerActivity}>{mixer.activity.name}</Text>
                              </>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={18} color={DS.Color.text3} />
                      </View>
                    </GelCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Group Highlights */}
        {(highlights.length > 0 || isSocialChair) && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
              <Text style={styles.sectionTitle}>Highlights</Text>
            </View>
            <View style={{ marginHorizontal: -DS.Spacing.lg }}>
              <HighlightsRow
                highlights={highlights}
                onHighlightPress={handleHighlightPress}
                onCreatePress={handleCreateHighlight}
                canCreate={isSocialChair}
              />
            </View>
          </View>
        )}

        {/* Past Mixers */}
        {pastMixers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past Mixers</Text>
              <Text style={styles.sectionCount}>{pastMixers.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mixersScroll}
              style={{ marginHorizontal: -DS.Spacing.lg }}
            >
              {pastMixers.slice(0, 5).map((mixer: Mixer) => {
                const otherGroup = mixer.groupAId === id ? mixer.groupB : mixer.groupA;
                return (
                  <Pressable
                    key={mixer.id}
                    onPress={() => {
                      Haptics.tap();
                      router.push(`/mixer/${mixer.id}`);
                    }}
                  >
                    <GelCard padding={DS.Spacing.md} style={styles.mixerCardPast}>
                      <Text style={styles.mixerCardTitle} numberOfLines={1}>
                        vs {otherGroup?.name ?? 'Unknown'}
                      </Text>
                      <View style={styles.mixerCardMeta}>
                        <Calendar size={12} color={DS.Color.text3} />
                        <Text style={styles.mixerCardMetaText}>{formatDate(mixer.scheduledStart)}</Text>
                      </View>
                      {mixer.avgRating !== undefined && mixer.avgRating !== null && (
                        <View style={styles.mixerCardMeta}>
                          <Star size={12} color="#FBBF24" fill="#FBBF24" />
                          <Text style={styles.mixerRatingText}>{mixer.avgRating.toFixed(1)}</Text>
                        </View>
                      )}
                      {mixer.activity && (
                        <View style={styles.activityBadge}>
                          <Text style={styles.activityBadgeText}>{mixer.activity.name}</Text>
                        </View>
                      )}
                    </GelCard>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sticky action buttons */}
      <View style={[styles.stickyActions, { paddingBottom: insets.bottom + 16 }]}>
        {/* Blur + tint base */}
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.stickyTint]} />
        {/* Top specular edge */}
        <View style={styles.stickySpecular} />

        {!profile ? null : isSocialChair ? (
          <>
            {/* Primary row: Send Mixer Request + Invite + Share */}
            <View style={styles.adminButtonRow}>
              {/* Send Mixer Request — purple glass card button */}
              <Pressable
                onPress={() => {
                  Haptics.medium();
                  router.push(`/send-mixer-request?groupId=${group.id}`);
                }}
                style={styles.adminPrimaryButton}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'rgba(147,51,234,0.55)', 'rgba(168,85,247,0.35)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminPrimaryBorder}
                >
                  <BlurView intensity={40} tint="dark" style={styles.adminPrimaryBlur}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                    <Sparkles size={17} color="#E9D5FF" strokeWidth={2} />
                    <Text style={styles.adminPrimaryText}>Send Mixer Request</Text>
                  </BlurView>
                </LinearGradient>
              </Pressable>

              {/* Invite — matching glass pill */}
              <Pressable
                onPress={() => { Haptics.tap(); setInviteModalVisible(true); }}
                style={({ pressed }) => [styles.iconActionButton, pressed && { opacity: 0.7 }]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconActionBorder}
                >
                  <View style={styles.iconActionInner}>
                    <UserPlus size={19} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Manage Group — glass secondary row */}
            <Pressable
              onPress={() => { Haptics.tap(); router.push(`/manage-group?groupId=${group.id}`); }}
              style={styles.secondaryActionButton}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.secondaryActionGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <Settings size={16} color="rgba(255,255,255,0.55)" strokeWidth={1.8} />
                <Text style={styles.secondaryActionText}>Manage Group</Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : isMember ? (
          <Pressable
            onPress={() => {
              Haptics.medium();
              leaveMutation.mutate();
            }}
            disabled={leaveMutation.isPending}
            style={styles.leaveButton}
          >
            {leaveMutation.isPending ? (
              <ActivityIndicator color={DS.Color.error} />
            ) : (
              <>
                <UserMinus size={18} color={DS.Color.error} />
                <Text style={styles.leaveButtonText}>Leave Group</Text>
              </>
            )}
          </Pressable>
        ) : hasPendingRequest ? (
          <View style={styles.pendingRequestButton}>
            <Clock size={18} color={DS.Color.text2} />
            <Text style={styles.pendingRequestText}>Request Pending</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              Haptics.medium();
              joinMutation.mutate();
            }}
            disabled={joinMutation.isPending}
          >
            <LinearGradient
              colors={['#FF7BD1', '#FF6BC1', '#FF5BB1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryActionButton}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    {group.isPrivate ? 'Request to Join' : 'Join Group'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Highlight Viewer */}
      <HighlightViewer
        visible={highlightViewerVisible}
        onClose={() => {
          setHighlightViewerVisible(false);
          setSelectedHighlight(null);
        }}
        highlight={selectedHighlight}
      />

      {/* Invite Members Modal */}
      <InviteMembersModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        groupId={id}
        groupName={group.name}
      />
    </GelBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: DS.Color.text2,
    fontSize: 16,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: DS.Color.glass,
  },
  emptyButtonText: {
    color: DS.Color.text2,
    fontWeight: '600',
  },
  heroSection: {
    height: 280,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notificationButtonContainer: {
    position: 'absolute',
    right: 16,
  },
  notificationButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editCoverButtonContainer: {
    position: 'absolute',
    right: 16,
  },
  editCoverButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.Color.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroBadges: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DS.Color.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: DS.Color.success + '50',
  },
  verifiedBadgeText: {
    color: DS.Color.success,
    fontSize: 11,
    fontWeight: '700',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  privateBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  publicBadgeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: 4,
  },
  groupName: {
    fontSize: 32,
    fontWeight: '900',
    color: DS.Color.text,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  collegeName: {
    color: DS.Color.text3,
    fontSize: 14,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  statsText: {
    color: DS.Color.text3,
    fontSize: 14,
    fontWeight: '600',
  },
  statsDot: {
    color: DS.Color.text3,
    fontSize: 14,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCount: {
    color: DS.Color.text3,
    fontSize: 12,
  },
  description: {
    color: DS.Color.text2,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 6,
  },
  membershipBadge: {
    marginTop: 16,
    backgroundColor: DS.Color.success + '18',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: DS.Color.success + '30',
  },
  membershipText: {
    color: DS.Color.success,
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: DS.Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DS.Color.text,
    letterSpacing: -0.2,
  },
  sectionCount: {
    color: DS.Color.text3,
    fontSize: 13,
    fontWeight: '600',
  },
  managementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.Spacing.md,
    gap: 12,
  },
  managementIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementContent: {
    flex: 1,
  },
  managementTitle: {
    color: DS.Color.text,
    fontWeight: '700',
    fontSize: 14,
  },
  managementSubtext: {
    color: DS.Color.text3,
    fontSize: 12,
    marginTop: 2,
  },
  managementDivider: {
    height: 1,
    backgroundColor: DS.Color.stroke,
    marginHorizontal: DS.Spacing.md,
  },
  inviteCodeText: {
    color: DS.Color.text2,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
  },
  copyHint: {
    color: DS.Color.text3,
    fontSize: 11,
    fontWeight: '500',
  },
  managementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.Color.gelPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mixersScroll: {
    paddingLeft: DS.Spacing.lg,
    paddingRight: DS.Spacing.md,
    gap: 12,
  },
  mixerCard: {
    width: 160,
    gap: 6,
  },
  mixerCardPast: {
    width: 160,
    gap: 6,
    opacity: 0.9,
  },
  mixerCardHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  mixerStatusBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  mixerStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0A0A0',
    textTransform: 'uppercase',
  },
  mixerCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 4,
  },
  mixerCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mixerCardMetaText: {
    fontSize: 12,
    color: DS.Color.text3,
  },
  mixerRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  activityBadge: {
    marginTop: 6,
    backgroundColor: DS.Color.glass,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  membersGrid: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  memberAvatarText: {
    color: DS.Color.text2,
    fontWeight: '700',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: DS.Color.text,
    fontWeight: '600',
    fontSize: 14,
  },
  memberYear: {
    color: DS.Color.text3,
    fontSize: 12,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewAllButton: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: DS.Color.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  viewAllText: {
    color: DS.Color.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  stickyActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: 12,
    gap: 10,
    overflow: 'hidden',
  },
  stickyTint: {
    backgroundColor: 'rgba(8,4,18,0.55)',
  },
  stickySpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    zIndex: 2,
  },
  primaryActionButton: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  secondaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  secondaryActionText: {
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '600',
    fontSize: 14,
  },
  iconActionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconActionBorder: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconActionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  // Admin button row styles
  adminButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adminPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminPrimaryBorder: {
    borderRadius: 12,
    padding: 1.5,
  },
  adminPrimaryBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 11,
    overflow: 'hidden',
  },
  adminPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: DS.Color.glass,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  inviteButtonContent: {
    alignItems: 'center',
  },
  inviteButtonLabel: {
    color: DS.Color.text2,
    fontWeight: '600',
    fontSize: 11,
  },
  inviteButtonCode: {
    color: DS.Color.text2,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  inviteButtonNew: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.Color.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.success + '40',
  },
  leaveButton: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: DS.Color.error,
    backgroundColor: DS.Color.error + '15',
  },
  leaveButtonText: {
    color: DS.Color.error,
    fontWeight: '700',
    fontSize: 16,
  },
  pendingRequestButton: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: DS.Color.text3,
    backgroundColor: DS.Color.glass,
  },
  pendingRequestText: {
    color: DS.Color.text2,
    fontWeight: '700',
    fontSize: 16,
  },
  // New member styles
  membersListContainer: {
    gap: 10,
  },
  memberCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberAvatarNew: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  memberAvatarFallbackNew: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarTextNew: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  memberInfoNew: {
    flex: 1,
  },
  memberNameNew: {
    color: DS.Color.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 3,
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberYearNew: {
    color: DS.Color.text3,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  memberCollegeNew: {
    color: DS.Color.text3,
    fontSize: 13,
    flex: 1,
  },
  memberRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadgeNew: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  roleBadgeTextNew: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Upcoming mixers styles
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upcomingMixersList: {
    gap: 10,
  },
  upcomingMixerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  upcomingMixerLeft: {
    alignItems: 'center',
  },
  upcomingMixerDateBox: {
    width: 52,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  upcomingMixerMonth: {
    color: '#A0A0A0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  upcomingMixerDay: {
    color: DS.Color.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  upcomingMixerContent: {
    flex: 1,
  },
  upcomingMixerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  upcomingMixerTitle: {
    color: DS.Color.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  upcomingMixerStatus: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  upcomingMixerStatusLocked: {
    backgroundColor: DS.Color.success + '20',
  },
  upcomingMixerStatusText: {
    color: '#A0A0A0',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  upcomingMixerStatusTextLocked: {
    color: DS.Color.success,
  },
  upcomingMixerTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upcomingMixerTimeText: {
    color: DS.Color.text3,
    fontSize: 13,
  },
  upcomingMixerDot: {
    color: DS.Color.text3,
    fontSize: 13,
  },
  upcomingMixerActivity: {
    color: DS.Color.pinkSparkle,
    fontSize: 13,
    fontWeight: '600',
  },
});
