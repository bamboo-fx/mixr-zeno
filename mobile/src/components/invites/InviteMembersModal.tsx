import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { X, Search, UserPlus, Check, Clock, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ProfileSearchResult, GroupInvite } from '@/lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InviteMembersModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function InviteMembersModal({
  visible,
  onClose,
  groupId,
  groupName,
}: InviteMembersModalProps) {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((q: string) => setDebouncedQuery(q), 300),
    []
  );

  useEffect(() => {
    debouncedSetQuery(searchQuery);
  }, [searchQuery, debouncedSetQuery]);

  // Search for users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['profile-search', debouncedQuery, groupId, profile?.collegeId],
    queryFn: () =>
      api.profileSearch(debouncedQuery, {
        collegeId: profile?.collegeId,
        excludeGroupId: groupId,
        limit: 15,
      }),
    enabled: debouncedQuery.length >= 2,
  });

  // Get sent invites for this group
  const { data: sentInvites = [] } = useQuery({
    queryKey: ['sent-invites', groupId],
    queryFn: () => api.invites.getSent(groupId),
    enabled: visible && !!groupId,
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: (inviteeId: string) => api.invites.send(groupId, profile!.id, inviteeId),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['sent-invites', groupId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  // Check if user has already been invited
  const getInviteStatus = (userId: string): 'none' | 'pending' | 'accepted' | 'declined' => {
    const invite = sentInvites.find((i) => i.inviteeId === userId);
    if (!invite) return 'none';
    return invite.status as 'pending' | 'accepted' | 'declined';
  };

  const handleSendInvite = (user: ProfileSearchResult) => {
    sendInviteMutation.mutate(user.id);
  };

  const handleClose = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    onClose();
  };

  // Filter out users who have already been invited or are pending
  const pendingInvites = sentInvites.filter((i) => i.status === 'pending');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <UserPlus size={20} color={DS.Color.gelPurple} />
                <Text style={styles.modalTitle}>Invite to {groupName}</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={20} color={DS.Color.text3} />
              </Pressable>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search size={18} color={DS.Color.text3} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor={DS.Color.text3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={16} color={DS.Color.text3} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Pending Invites */}
            {pendingInvites.length > 0 && searchQuery.length < 2 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={14} color={DS.Color.text3} />
                  <Text style={styles.sectionTitle}>Pending Invites</Text>
                  <Text style={styles.sectionCount}>{pendingInvites.length}</Text>
                </View>
                {pendingInvites.map((invite) => (
                  <View key={invite.id} style={styles.userCard}>
                    {invite.invitee?.avatarUrl ? (
                      <Image source={{ uri: invite.invitee.avatarUrl }} style={styles.userAvatar} />
                    ) : (
                      <LinearGradient
                        colors={['#3AE3A0', '#4F7CFF']}
                        style={styles.userAvatarFallback}
                      >
                        <Text style={styles.userAvatarText}>
                          {getInitials(invite.invitee?.name)}
                        </Text>
                      </LinearGradient>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{invite.invitee?.name ?? 'Unknown'}</Text>
                      <Text style={styles.userEmail}>{invite.invitee?.email}</Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Clock size={12} color={DS.Color.text3} />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Search Results */}
            {debouncedQuery.length >= 2 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Users size={14} color={DS.Color.text3} />
                  <Text style={styles.sectionTitle}>
                    {searchLoading ? 'Searching...' : `Results for "${debouncedQuery}"`}
                  </Text>
                </View>

                {searchLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={DS.Color.gelPurple} />
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No users found</Text>
                    <Text style={styles.emptySubtext}>
                      Try a different name or email address
                    </Text>
                  </View>
                ) : (
                  searchResults.map((user) => {
                    const inviteStatus = getInviteStatus(user.id);
                    const isPending = inviteStatus === 'pending';
                    const isInviting = sendInviteMutation.isPending && sendInviteMutation.variables === user.id;

                    return (
                      <View key={user.id} style={styles.userCard}>
                        {user.avatarUrl ? (
                          <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
                        ) : (
                          <LinearGradient
                            colors={['#3AE3A0', '#4F7CFF']}
                            style={styles.userAvatarFallback}
                          >
                            <Text style={styles.userAvatarText}>{getInitials(user.name)}</Text>
                          </LinearGradient>
                        )}
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{user.name}</Text>
                          <Text style={styles.userMeta}>
                            {user.yearInSchool ? `${user.yearInSchool} · ` : ''}
                            {user.college?.name ?? user.email}
                          </Text>
                        </View>
                        {isPending ? (
                          <View style={styles.pendingBadge}>
                            <Clock size={12} color={DS.Color.text3} />
                            <Text style={styles.pendingText}>Invited</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleSendInvite(user)}
                            disabled={isInviting}
                            style={styles.inviteButton}
                          >
                            {isInviting ? (
                              <ActivityIndicator size="small" color={DS.Color.gelPurple} />
                            ) : (
                              <>
                                <UserPlus size={16} color={DS.Color.gelPurple} />
                                <Text style={styles.inviteButtonText}>Invite</Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Empty state when no search */}
            {debouncedQuery.length < 2 && pendingInvites.length === 0 && (
              <View style={styles.emptyState}>
                <Search size={48} color={DS.Color.text3} />
                <Text style={styles.emptyTitle}>Search for members</Text>
                <Text style={styles.emptySubtext}>
                  Find people at your college to invite to this group
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: DS.Color.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: DS.Color.text3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.Color.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.Color.glass,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: DS.Spacing.lg,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DS.Color.text,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: DS.Spacing.lg,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.Color.text3,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: DS.Color.text3,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: DS.Color.text3,
  },
  userMeta: {
    fontSize: 13,
    color: DS.Color.text3,
    textTransform: 'capitalize',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: DS.Color.glass,
    borderRadius: 100,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text3,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: DS.Color.gelPurple + '20',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: DS.Color.gelPurple + '40',
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.Color.gelPurple,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.Color.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  emptySubtext: {
    fontSize: 13,
    color: DS.Color.text3,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
