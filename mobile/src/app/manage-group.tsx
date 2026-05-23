import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Settings,
  Users,
  Crown,
  Shield,
  UserMinus,
  ChevronRight,
  Pencil,
  Save,
  X,
  Lock,
  Globe,
} from 'lucide-react-native';
import type { GroupMember, MemberRole } from '@/lib/types';
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

const ROLE_CONFIG: Record<MemberRole, { label: string; color: string; icon: typeof Crown }> = {
  admin: { label: 'Admin', color: DS.Color.gelPurple, icon: Crown },
  social_chair: { label: 'Social Chair', color: DS.Color.success, icon: Shield },
  member: { label: 'Member', color: DS.Color.text3, icon: Users },
};

export default function ManageGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: group, isLoading, refetch } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.groups.get(groupId),
    enabled: !!groupId,
  });

  React.useEffect(() => {
    if (group) {
      setEditName(group.name ?? '');
      setEditDescription(group.description ?? '');
    }
  }, [group]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; isPrivate?: boolean }) =>
      api.groups.update(groupId, { ...data, requesterId: profile!.id }),
    onSuccess: () => {
      Haptics.success();
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const togglePrivacyMutation = useMutation({
    mutationFn: (isPrivate: boolean) =>
      api.groups.update(groupId, { isPrivate, requesterId: profile!.id }),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      api.groups.updateMemberRole(groupId, userId, role, profile!.id),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.groups.removeMember(groupId, userId, profile!.id),
    onSuccess: () => {
      Haptics.warning();
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const handleSaveChanges = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    updateGroupMutation.mutate({
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  const handleChangeRole = (member: GroupMember) => {
    if (member.userId === profile?.id) {
      Alert.alert('Error', "You can't change your own role");
      return;
    }

    const roles: MemberRole[] = ['member', 'social_chair', 'admin'];
    const options = roles.map((role) => ({
      text: ROLE_CONFIG[role].label,
      onPress: () => updateRoleMutation.mutate({ userId: member.userId, role }),
    }));

    Alert.alert(
      'Change Role',
      `Select a new role for ${member.user?.name ?? 'this member'}`,
      [...options, { text: 'Cancel', style: 'cancel' }]
    );
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (member.userId === profile?.id) {
      Alert.alert('Error', "You can't remove yourself");
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name ?? 'this member'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate(member.userId),
        },
      ]
    );
  };

  const members = group?.members ?? [];
  const admins = members.filter((m) => m.role === 'admin');
  const socialChairs = members.filter((m) => m.role === 'social_chair');
  const regularMembers = members.filter((m) => m.role === 'member');

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
          <Settings size={48} color={DS.Color.text3} />
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
          <Text style={styles.headerTitle}>Manage Group</Text>
        </View>
        {isEditing ? (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.tap();
                setIsEditing(false);
                setEditName(group.name ?? '');
                setEditDescription(group.description ?? '');
              }}
              style={styles.headerActionButton}
            >
              <X size={18} color={DS.Color.error} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.medium();
                handleSaveChanges();
              }}
              disabled={updateGroupMutation.isPending}
              style={[styles.headerActionButton, { backgroundColor: DS.Color.success + '20' }]}
            >
              {updateGroupMutation.isPending ? (
                <ActivityIndicator size="small" color={DS.Color.success} />
              ) : (
                <Save size={18} color={DS.Color.success} />
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              Haptics.tap();
              setIsEditing(true);
            }}
            style={styles.editButton}
          >
            <Pencil size={16} color={DS.Color.gelPurple} />
          </Pressable>
        )}
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
        {/* Group Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Info</Text>
          <GelCard padding={DS.Spacing.md}>
            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Group name"
                    placeholderTextColor={DS.Color.text3}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Group description (optional)"
                    placeholderTextColor={DS.Color.text3}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.infoDisplay}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{group.name}</Text>
                </View>
                {group.description && (
                  <View style={[styles.infoRow, { marginTop: 12 }]}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{group.description}</Text>
                  </View>
                )}
                <View style={[styles.infoRow, { marginTop: 12 }]}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <View style={[styles.categoryBadge]}>
                    <Text style={styles.categoryText}>{group.category}</Text>
                  </View>
                </View>
              </View>
            )}
          </GelCard>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <GelCard padding={DS.Spacing.md}>
            <Pressable
              onPress={() => {
                Haptics.tap();
                togglePrivacyMutation.mutate(!group.isPrivate);
              }}
              disabled={togglePrivacyMutation.isPending}
              style={styles.privacyRow}
            >
              <View
                style={[
                  styles.privacyIconContainer,
                  { backgroundColor: group.isPrivate ? DS.Color.gelPurple + '20' : DS.Color.glass },
                ]}
              >
                {group.isPrivate ? (
                  <Lock size={20} color={DS.Color.gelPurple} />
                ) : (
                  <Globe size={20} color={DS.Color.text2} />
                )}
              </View>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>
                  {group.isPrivate ? 'Private Group' : 'Public Group'}
                </Text>
                <Text style={styles.privacySubtext}>
                  {group.isPrivate
                    ? 'Members must request to join'
                    : 'Anyone can join freely'}
                </Text>
              </View>
              {togglePrivacyMutation.isPending ? (
                <ActivityIndicator size="small" color={DS.Color.gelPurple} />
              ) : (
                <Switch
                  value={group.isPrivate}
                  onValueChange={(val) => {
                    Haptics.tap();
                    togglePrivacyMutation.mutate(val);
                  }}
                  trackColor={{ false: DS.Color.glass, true: DS.Color.gelPurple + '60' }}
                  thumbColor={group.isPrivate ? DS.Color.gelPurple : DS.Color.text3}
                />
              )}
            </Pressable>
          </GelCard>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <Text style={styles.memberCount}>{members.length}</Text>
          </View>

          {/* Admins */}
          {admins.length > 0 && (
            <View style={styles.roleGroup}>
              <View style={styles.roleHeader}>
                <Crown size={14} color={DS.Color.gelPurple} />
                <Text style={[styles.roleTitle, { color: DS.Color.gelPurple }]}>
                  Admins ({admins.length})
                </Text>
              </View>
              {admins.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onChangeRole={() => handleChangeRole(member)}
                  onRemove={() => handleRemoveMember(member)}
                  isCurrentUser={member.userId === profile?.id}
                  isPending={removeMemberMutation.isPending && removeMemberMutation.variables === member.userId}
                />
              ))}
            </View>
          )}

          {/* Social Chairs */}
          {socialChairs.length > 0 && (
            <View style={styles.roleGroup}>
              <View style={styles.roleHeader}>
                <Shield size={14} color={DS.Color.success} />
                <Text style={[styles.roleTitle, { color: DS.Color.success }]}>
                  Social Chairs ({socialChairs.length})
                </Text>
              </View>
              {socialChairs.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onChangeRole={() => handleChangeRole(member)}
                  onRemove={() => handleRemoveMember(member)}
                  isCurrentUser={member.userId === profile?.id}
                  isPending={removeMemberMutation.isPending && removeMemberMutation.variables === member.userId}
                />
              ))}
            </View>
          )}

          {/* Regular Members */}
          {regularMembers.length > 0 && (
            <View style={styles.roleGroup}>
              <View style={styles.roleHeader}>
                <Users size={14} color={DS.Color.text3} />
                <Text style={[styles.roleTitle, { color: DS.Color.text3 }]}>
                  Members ({regularMembers.length})
                </Text>
              </View>
              {regularMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onChangeRole={() => handleChangeRole(member)}
                  onRemove={() => handleRemoveMember(member)}
                  isCurrentUser={member.userId === profile?.id}
                  isPending={removeMemberMutation.isPending && removeMemberMutation.variables === member.userId}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </GelBackground>
  );
}

interface MemberCardProps {
  member: GroupMember;
  onChangeRole: () => void;
  onRemove: () => void;
  isCurrentUser: boolean;
  isPending: boolean;
}

function MemberCard({ member, onChangeRole, onRemove, isCurrentUser, isPending }: MemberCardProps) {
  const router = useRouter();
  const user = member.user;
  const roleConfig = ROLE_CONFIG[member.role];

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
        <View style={styles.memberCard}>
          {/* Avatar */}
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

          {/* User Info */}
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {user?.name ?? 'Unknown'}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            {user?.yearInSchool && (
              <Text style={styles.memberMeta}>{user.yearInSchool}</Text>
            )}
          </View>

          {/* Actions */}
          {!isCurrentUser && (
            <View style={styles.memberActions}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.tap();
                  onChangeRole();
                }}
                style={styles.roleButton}
              >
                <Text style={[styles.roleButtonText, { color: roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
                <ChevronRight size={14} color={DS.Color.text3} />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.warning();
                  onRemove();
                }}
                disabled={isPending}
                style={styles.removeButton}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={DS.Color.error} />
                ) : (
                  <UserMinus size={16} color={DS.Color.error} />
                )}
              </Pressable>
            </View>
          )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.Color.gelPurple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.gelPurple + '40',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: DS.Spacing.lg,
    paddingHorizontal: DS.Spacing.lg,
  },
  section: {
    marginBottom: DS.Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.Color.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 13,
    color: DS.Color.text3,
    fontWeight: '600',
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  textInput: {
    backgroundColor: DS.Color.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: DS.Color.text,
  },
  textAreaInput: {
    minHeight: 80,
  },
  infoDisplay: {},
  infoRow: {},
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text3,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    color: DS.Color.text,
    lineHeight: 22,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: DS.Color.gelPurple + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.Color.gelPurple,
    textTransform: 'capitalize',
  },
  roleGroup: {
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: DS.Color.text,
  },
  youBadge: {
    backgroundColor: DS.Color.gelPurple + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DS.Color.gelPurple,
  },
  memberMeta: {
    fontSize: 13,
    color: DS.Color.text3,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DS.Color.glass,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.Color.error + '30',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
  privacySubtext: {
    fontSize: 12,
    color: DS.Color.text3,
    marginTop: 2,
  },
});
