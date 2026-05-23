import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type GroupJoinRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  UserPlus,
  Check,
  X,
  Clock,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GelBackground, GelCard } from '@/components/gel';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ManageJoinRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.groups.get(groupId),
    enabled: !!groupId,
  });

  const { data: joinRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: () => api.groups.getJoinRequests(groupId),
    enabled: !!groupId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.groups.respondToJoinRequest(groupId, requestId, 'approved', profile!.id),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.groups.respondToJoinRequest(groupId, requestId, 'declined', profile!.id),
    onSuccess: () => {
      Haptics.warning();
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const pendingRequests = joinRequests.filter((r) => r.status === 'pending');

  if (isLoading || groupLoading) {
    return (
      <GelBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DS.Color.gelPurple} />
        </View>
      </GelBackground>
    );
  }

  return (
    <GelBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => {
            Haptics.tap();
            router.back();
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Join Requests</Text>
          {group && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {group.name}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DS.Color.gelPurple}
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <GelCard padding={DS.Spacing.md}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: DS.Color.gelPurple + '20' }]}>
                  <Clock size={18} color={DS.Color.gelPurple} />
                </View>
                <View>
                  <Text style={styles.statValue}>{pendingRequests.length}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: DS.Color.success + '20' }]}>
                  <Users size={18} color={DS.Color.success} />
                </View>
                <View>
                  <Text style={styles.statValue}>{group?._count?.members ?? 0}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
              </View>
            </View>
          </GelCard>
        </View>

        {/* Requests List */}
        {pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <UserPlus size={32} color={DS.Color.text3} />
            </View>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptySubtitle}>
              New join requests will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            <Text style={styles.sectionTitle}>
              {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
            </Text>
            {pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={() => approveMutation.mutate(request.id)}
                onDecline={() => declineMutation.mutate(request.id)}
                isApproving={approveMutation.isPending && approveMutation.variables === request.id}
                isDeclining={declineMutation.isPending && declineMutation.variables === request.id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </GelBackground>
  );
}

interface RequestCardProps {
  request: GroupJoinRequest;
  onApprove: () => void;
  onDecline: () => void;
  isApproving: boolean;
  isDeclining: boolean;
}

function RequestCard({ request, onApprove, onDecline, isApproving, isDeclining }: RequestCardProps) {
  const router = useRouter();
  const user = request.user;

  return (
    <Pressable
      onPress={() => {
        Haptics.tap();
        if (user?.id) {
          router.push(`/user/${user.id}`);
        }
      }}
    >
      <GelCard padding={DS.Spacing.md}>
        <View style={styles.requestCard}>
          {/* User Info */}
          <View style={styles.requestUser}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#A855F7', '#8B5CF6']}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </LinearGradient>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name ?? 'Unknown'}
              </Text>
              <View style={styles.userMeta}>
                {user?.yearInSchool && (
                  <Text style={styles.userMetaText}>{user.yearInSchool}</Text>
                )}
                {user?.college?.name && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.userMetaText} numberOfLines={1}>
                      {user.college.name}
                    </Text>
                  </>
                )}
              </View>
              <Text style={styles.requestTime}>
                Requested {formatTimeAgo(request.createdAt)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.medium();
                onApprove();
              }}
              disabled={isApproving || isDeclining}
              style={styles.approveButton}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.warning();
                onDecline();
              }}
              disabled={isApproving || isDeclining}
              style={styles.declineButton}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={DS.Color.error} />
              ) : (
                <X size={18} color={DS.Color.error} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </View>
      </GelCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: DS.Color.glass,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DS.Color.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: DS.Color.text3,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: DS.Spacing.lg,
    paddingHorizontal: DS.Spacing.lg,
  },
  statsContainer: {
    marginBottom: DS.Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: DS.Color.text,
  },
  statLabel: {
    fontSize: 12,
    color: DS.Color.text3,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: DS.Color.stroke,
    marginHorizontal: DS.Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DS.Color.text3,
    textAlign: 'center',
  },
  requestsList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.Color.text2,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userMetaText: {
    fontSize: 13,
    color: DS.Color.text3,
  },
  metaDot: {
    color: DS.Color.text3,
    fontSize: 13,
  },
  requestTime: {
    fontSize: 12,
    color: DS.Color.text3,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.Color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.Color.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.error + '40',
  },
});
