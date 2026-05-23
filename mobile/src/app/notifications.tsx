import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GelBackground, GelCard, SegmentedControl } from '@/components/gel';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  X,
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mail,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Notification, GroupInvite, ChatRoom, DirectConversation } from '@/lib/types';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// Gradient palettes for fallback avatars, cycled by index
const AVATAR_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A855F7'],
  ['#2563EB', '#7C3AED'],
  ['#D946EF', '#A855F7'],
  ['#0891B2', '#7C3AED'],
  ['#16A34A', '#2563EB'],
];

function getAvatarGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] ?? ['#7C3AED', '#A855F7'];
}

// ─── Chat Room Row ────────────────────────────────────────────────────────────

interface ChatRoomRowProps {
  room: ChatRoom;
  index: number;
  onPress: () => void;
}

function ChatRoomRow({ room, index, onPress }: ChatRoomRowProps) {
  const gradientColors = getAvatarGradient(room.id);

  const lastMessageText = room.lastMessage
    ? `${room.lastMessage.senderName}: ${truncate(room.lastMessage.text, 32)}`
    : 'No messages yet';

  const isMixerRoom = room.type === 'mixer';
  const isOpenMixerRoom = room.type === 'openMixer';
  const hasUnread = room.unreadCount > 0;
  const timeLabel = formatTimeAgo(room.lastMessageAt);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        onPress={() => {
          Haptics.tap();
          onPress();
        }}
        style={({ pressed }) => [
          styles.roomRow,
          pressed && styles.roomRowPressed,
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {room.coverImageUrl ? (
            <Image
              source={{ uri: room.coverImageUrl }}
              style={styles.roomAvatar}
            />
          ) : (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roomAvatar}
            >
              {isMixerRoom || isOpenMixerRoom ? (
                <Text style={styles.mixerRoomIcon}>⚡</Text>
              ) : (
                <Text style={styles.avatarInitials}>
                  {getInitials(room.name)}
                </Text>
              )}
            </LinearGradient>
          )}

          {/* Unread dot badge on avatar */}
          {hasUnread && <View style={styles.avatarUnreadBadge} />}
        </View>

        {/* Content */}
        <View style={styles.roomContent}>
          <View style={styles.roomHeader}>
            <Text
              style={[styles.roomName, hasUnread && styles.roomNameUnread]}
              numberOfLines={1}
            >
              {room.name}
            </Text>
            {timeLabel ? <Text style={styles.roomTime}>{timeLabel}</Text> : null}
          </View>

          <Text
            style={[
              styles.lastMessage,
              hasUnread && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {lastMessageText}
          </Text>

          {/* Unread count badge inline */}
          {hasUnread && room.unreadCount > 1 && (
            <View style={styles.unreadBadgeInline}>
              <Text style={styles.unreadCountText}>
                {room.unreadCount > 99 ? '99+' : String(room.unreadCount)} new
              </Text>
            </View>
          )}

          {/* Room type badge */}
          {(isMixerRoom || isOpenMixerRoom) && (
            <View style={styles.mixerBadgeRow}>
              <View style={styles.mixerBadge}>
                <Text style={styles.mixerBadgeText}>
                  {isMixerRoom ? 'Social Chair Chat' : 'Open Mixer'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </Pressable>

      {/* Separator */}
      <View style={styles.separator} />
    </Animated.View>
  );
}

// ─── Direct Message Row ───────────────────────────────────────────────────────

interface DMRowProps {
  conversation: DirectConversation;
  index: number;
  onPress: () => void;
}

function DMRow({ conversation, index, onPress }: DMRowProps) {
  const gradientColors = getAvatarGradient(conversation.otherUser.id);

  const lastMessageText = conversation.lastMessage
    ? truncate(conversation.lastMessage.text, 40)
    : 'No messages yet';

  const timeLabel = formatTimeAgo(conversation.lastMessageAt);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        onPress={() => {
          Haptics.tap();
          onPress();
        }}
        style={({ pressed }) => [
          styles.roomRow,
          pressed && styles.roomRowPressed,
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {conversation.otherUser.avatarUrl ? (
            <Image
              source={{ uri: conversation.otherUser.avatarUrl }}
              style={[styles.roomAvatar, { borderRadius: 28 }]}
            />
          ) : (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.roomAvatar, { borderRadius: 28 }]}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(conversation.otherUser.name)}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Content */}
        <View style={styles.roomContent}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName} numberOfLines={1}>
              {conversation.otherUser.name}
            </Text>
            {timeLabel ? <Text style={styles.roomTime}>{timeLabel}</Text> : null}
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessageText}
          </Text>
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </Pressable>

      {/* Separator */}
      <View style={styles.separator} />
    </Animated.View>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

interface RequestsTabProps {
  refreshing: boolean;
  onRefresh: () => void;
}

function RequestsTab({ refreshing, onRefresh }: RequestsTabProps) {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => api.notifications.list(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['pending-invites', profile?.id],
    queryFn: () => api.invites.getPending(profile!.id),
    enabled: !!profile?.id,
  });

  // Fetch message requests
  const { data: dmConversations, isLoading: dmLoading } = useQuery({
    queryKey: ['dm-conversations', profile?.id],
    queryFn: () => api.dm.getConversations(profile!.id),
    enabled: !!profile?.id,
  });

  const messageRequests = dmConversations?.pendingReceived ?? [];

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markRead(profile!.id, { markAllRead: true }),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['notification-count', profile?.id] });
    },
  });

  const respondToInviteMutation = useMutation({
    mutationFn: ({
      inviteId,
      response,
    }: {
      inviteId: string;
      response: 'accepted' | 'declined';
    }) => api.invites.respond(inviteId, profile!.id, response),
    onSuccess: async (_, { response }) => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['pending-invites', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Refresh profile so groupMemberships reflects the newly accepted group
      if (response === 'accepted' && profile?.id) {
        const updatedProfile = await api.profiles.get(profile.id);
        setProfile(updatedProfile);
      }
    },
    onError: () => {
      Haptics.error();
    },
  });

  const acceptMessageRequestMutation = useMutation({
    mutationFn: (conversationId: string) =>
      api.dm.acceptRequest(conversationId, profile!.id),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', profile?.id] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const declineMessageRequestMutation = useMutation({
    mutationFn: (conversationId: string) =>
      api.dm.declineRequest(conversationId, profile!.id),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', profile?.id] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isLoading = notificationsLoading || invitesLoading || dmLoading;

  const handleAcceptInvite = (invite: GroupInvite) => {
    respondToInviteMutation.mutate({ inviteId: invite.id, response: 'accepted' });
  };

  const handleDeclineInvite = (invite: GroupInvite) => {
    respondToInviteMutation.mutate({ inviteId: invite.id, response: 'declined' });
  };

  const handleAcceptMessageRequest = (conversation: DirectConversation) => {
    acceptMessageRequestMutation.mutate(conversation.id);
  };

  const handleDeclineMessageRequest = (conversation: DirectConversation) => {
    declineMessageRequestMutation.mutate(conversation.id);
  };

  const handleViewMessageRequest = (conversation: DirectConversation) => {
    router.push({
      pathname: '/dm-chat',
      params: {
        conversationId: conversation.id,
        otherUserName: conversation.otherUser.name,
        otherUserId: conversation.otherUser.id,
      },
    });
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      api.notifications.markRead(profile!.id, { notificationIds: [notification.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    }
    if (notification.data) {
      try {
        const data = JSON.parse(notification.data);
        if (data.groupId) {
          router.push(`/group/${data.groupId}`);
        }
        if (data.conversationId) {
          router.push({
            pathname: '/dm-chat',
            params: { conversationId: data.conversationId },
          });
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DS.Color.gelPurple} />
      </View>
    );
  }

  const isEmpty = notifications.length === 0 && pendingInvites.length === 0 && messageRequests.length === 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.requestsScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={DS.Color.gelPurple}
        />
      }
    >
      {isEmpty ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
          <LinearGradient
            colors={['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.05)']}
            style={styles.emptyIconCircle}
          >
            <BellOff size={32} color={DS.Color.gelPurple} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>
            Group invites, message requests, and activity updates will appear here.
          </Text>
        </Animated.View>
      ) : (
        <>
          {/* Mark all read button */}
          {unreadCount > 0 && (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              style={styles.markAllRow}
            >
              <Text style={styles.markAllText}>
                Mark all {unreadCount} read
              </Text>
            </Pressable>
          )}

          {/* Message Requests */}
          {messageRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <Mail size={14} color={DS.Color.gelPurple} />
                <Text style={styles.sectionTitle}>Message Requests</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{messageRequests.length}</Text>
                </View>
              </View>

              <View style={styles.invitesList}>
                {messageRequests.map((conversation, i) => (
                  <Animated.View
                    key={conversation.id}
                    entering={FadeInDown.delay(i * 50).springify()}
                  >
                    <GelCard padding={DS.Spacing.md}>
                      <View style={styles.inviteCard}>
                        <Pressable
                          style={styles.inviteInfo}
                          onPress={() => handleViewMessageRequest(conversation)}
                        >
                          {conversation.otherUser.avatarUrl ? (
                            <Image
                              source={{ uri: conversation.otherUser.avatarUrl }}
                              style={[styles.inviterAvatar, { borderRadius: 22 }]}
                            />
                          ) : (
                            <LinearGradient
                              colors={getAvatarGradient(conversation.otherUser.id)}
                              style={[styles.inviterAvatar, { borderRadius: 22 }]}
                            >
                              <Text style={styles.inviterAvatarText}>
                                {getInitials(conversation.otherUser.name)}
                              </Text>
                            </LinearGradient>
                          )}
                          <View style={styles.inviteTextContainer}>
                            <Text style={styles.inviteTitle} numberOfLines={2}>
                              <Text style={styles.inviterName}>
                                {conversation.otherUser.name}
                              </Text>
                              <Text style={styles.inviteConnector}>
                                {' wants to message you'}
                              </Text>
                            </Text>
                            {conversation.lastMessage && (
                              <Text style={styles.messagePreview} numberOfLines={1}>
                                "{truncate(conversation.lastMessage.text, 30)}"
                              </Text>
                            )}
                            <Text style={styles.inviteTime}>
                              {formatTimeAgo(conversation.createdAt)}
                            </Text>
                          </View>
                        </Pressable>
                        <View style={styles.inviteActions}>
                          <Pressable
                            onPress={() => handleAcceptMessageRequest(conversation)}
                            disabled={acceptMessageRequestMutation.isPending}
                            style={styles.acceptButton}
                          >
                            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeclineMessageRequest(conversation)}
                            disabled={declineMessageRequestMutation.isPending}
                            style={styles.declineButton}
                          >
                            <X size={16} color={DS.Color.error} strokeWidth={2.5} />
                          </Pressable>
                        </View>
                      </View>
                    </GelCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <UserPlus size={14} color={DS.Color.gelPurple} />
                <Text style={styles.sectionTitle}>Group Invites</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pendingInvites.length}</Text>
                </View>
              </View>

              <View style={styles.invitesList}>
                {pendingInvites.map((invite, i) => (
                  <Animated.View
                    key={invite.id}
                    entering={FadeInDown.delay(i * 50).springify()}
                  >
                    <GelCard padding={DS.Spacing.md}>
                      <View style={styles.inviteCard}>
                        <View style={styles.inviteInfo}>
                          {invite.inviter?.avatarUrl ? (
                            <Image
                              source={{ uri: invite.inviter.avatarUrl }}
                              style={styles.inviterAvatar}
                            />
                          ) : (
                            <LinearGradient
                              colors={getAvatarGradient(invite.inviterId)}
                              style={styles.inviterAvatar}
                            >
                              <Text style={styles.inviterAvatarText}>
                                {getInitials(invite.inviter?.name)}
                              </Text>
                            </LinearGradient>
                          )}
                          <View style={styles.inviteTextContainer}>
                            <Text style={styles.inviteTitle} numberOfLines={2}>
                              <Text style={styles.inviterName}>
                                {invite.inviter?.name ?? 'Someone'}
                              </Text>
                              <Text style={styles.inviteConnector}>
                                {' invited you to '}
                              </Text>
                              <Text style={styles.groupName}>
                                {invite.group?.name ?? 'a group'}
                              </Text>
                            </Text>
                            <Text style={styles.inviteTime}>
                              {formatTimeAgo(invite.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.inviteActions}>
                          <Pressable
                            onPress={() => handleAcceptInvite(invite)}
                            disabled={respondToInviteMutation.isPending}
                            style={styles.acceptButton}
                          >
                            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeclineInvite(invite)}
                            disabled={respondToInviteMutation.isPending}
                            style={styles.declineButton}
                          >
                            <X size={16} color={DS.Color.error} strokeWidth={2.5} />
                          </Pressable>
                        </View>
                      </View>
                    </GelCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <Bell size={14} color={DS.Color.text3} />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>

              <View style={styles.notificationsList}>
                {notifications.map((notification, i) => (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInDown.delay(i * 40).springify()}
                  >
                    <Pressable onPress={() => handleNotificationPress(notification)}>
                      <GelCard
                        padding={DS.Spacing.md}
                        style={
                          !notification.read ? styles.unreadCard : undefined
                        }
                      >
                        <View style={styles.notificationContent}>
                          <View
                            style={[
                              styles.notificationIcon,
                              notification.type === 'group_invite' && styles.iconInvite,
                              notification.type === 'invite_accepted' && styles.iconAccepted,
                              notification.type === 'invite_declined' && styles.iconDeclined,
                              notification.type === 'message_request' && styles.iconInvite,
                              notification.type === 'message_request_accepted' && styles.iconAccepted,
                            ]}
                          >
                            {notification.type === 'group_invite' && (
                              <UserPlus size={15} color={DS.Color.gelPurple} />
                            )}
                            {notification.type === 'invite_accepted' && (
                              <CheckCircle2 size={15} color={DS.Color.success} />
                            )}
                            {notification.type === 'invite_declined' && (
                              <XCircle size={15} color={DS.Color.error} />
                            )}
                            {notification.type === 'join_request' && (
                              <Users size={15} color={DS.Color.gelPurple} />
                            )}
                            {notification.type === 'message_request' && (
                              <Mail size={15} color={DS.Color.gelPurple} />
                            )}
                            {notification.type === 'message_request_accepted' && (
                              <CheckCircle2 size={15} color={DS.Color.success} />
                            )}
                            {notification.type === 'general' && (
                              <Bell size={15} color={DS.Color.text2} />
                            )}
                          </View>
                          <View style={styles.notificationText}>
                            <Text style={styles.notificationTitle}>
                              {notification.title}
                            </Text>
                            <Text style={styles.notificationBody} numberOfLines={2}>
                              {notification.body}
                            </Text>
                            <Text style={styles.notificationTime}>
                              {formatTimeAgo(notification.createdAt)}
                            </Text>
                          </View>
                          {!notification.read && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                      </GelCard>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────

interface MessagesTabProps {
  refreshing: boolean;
  onRefresh: () => void;
}

function MessagesTab({ refreshing, onRefresh }: MessagesTabProps) {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms', profile?.id],
    queryFn: () => api.chat.getRooms(profile!.id),
    enabled: !!profile?.id,
  });

  // Fetch accepted direct conversations
  const { data: dmConversations, isLoading: dmLoading } = useQuery({
    queryKey: ['dm-conversations', profile?.id],
    queryFn: () => api.dm.getConversations(profile!.id),
    enabled: !!profile?.id,
  });

  const acceptedDMs = dmConversations?.accepted ?? [];
  const isLoading = roomsLoading || dmLoading;

  // Combine and sort all conversations by lastMessageAt
  type MessageItem =
    | { type: 'room'; data: ChatRoom }
    | { type: 'dm'; data: DirectConversation };

  const allItems: MessageItem[] = [
    ...rooms.map((room) => ({ type: 'room' as const, data: room })),
    ...acceptedDMs.map((dm) => ({ type: 'dm' as const, data: dm })),
  ].sort((a, b) => {
    const aTime = a.type === 'room' ? a.data.lastMessageAt : a.data.lastMessageAt;
    const bTime = b.type === 'room' ? b.data.lastMessageAt : b.data.lastMessageAt;
    if (aTime && bTime) {
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }
    if (aTime) return -1;
    if (bTime) return 1;
    const aName = a.type === 'room' ? a.data.name : a.data.otherUser.name;
    const bName = b.type === 'room' ? b.data.name : b.data.otherUser.name;
    return aName.localeCompare(bName);
  });

  const navigateToRoom = useCallback(
    (room: ChatRoom) => {
      router.push({
        pathname: '/chat-room',
        params: { roomId: room.id, roomName: room.name },
      });
    },
    [router]
  );

  const navigateToDM = useCallback(
    (conversation: DirectConversation) => {
      router.push({
        pathname: '/dm-chat',
        params: {
          conversationId: conversation.id,
          otherUserName: conversation.otherUser.name,
          otherUserId: conversation.otherUser.id,
        },
      });
    },
    [router]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DS.Color.gelPurple} />
      </View>
    );
  }

  if (allItems.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DS.Color.gelPurple}
          />
        }
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
          <LinearGradient
            colors={['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.05)']}
            style={styles.emptyIconCircle}
          >
            <MessageCircle size={32} color={DS.Color.gelPurple} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptySubtitle}>
            Join a group or message someone to start chatting!
          </Text>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={allItems}
      keyExtractor={(item) => (item.type === 'room' ? `room-${item.data.id}` : `dm-${item.data.id}`)}
      renderItem={({ item, index }) =>
        item.type === 'room' ? (
          <ChatRoomRow
            room={item.data}
            index={index}
            onPress={() => navigateToRoom(item.data)}
          />
        ) : (
          <DMRow
            conversation={item.data}
            index={index}
            onPress={() => navigateToDM(item.data)}
          />
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={DS.Color.gelPurple}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.roomsListContent}
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = ['Messages', 'Requests'] as const;
type TabName = (typeof TABS)[number];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('Messages');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile?.id] }),
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', profile?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
      queryClient.invalidateQueries({ queryKey: ['pending-invites', profile?.id] }),
    ]);
    setRefreshing(false);
  };

  const handleTabChange = (tab: string) => {
    Haptics.selection();
    setActiveTab(tab as TabName);
  };

  return (
    <GelBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.tap();
            router.back();
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.tabRow}>
        <SegmentedControl
          options={[...TABS]}
          value={activeTab}
          onChange={handleTabChange}
          style={styles.segmentedControl}
        />
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Messages' ? (
          <MessagesTab refreshing={refreshing} onRefresh={handleRefresh} />
        ) : (
          <RequestsTab refreshing={refreshing} onRefresh={handleRefresh} />
        )}
      </View>
    </GelBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: 12,
    gap: 12,
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
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: DS.Color.text,
    letterSpacing: -0.5,
    flex: 1,
  },

  // Tabs
  tabRow: {
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: 8,
  },
  segmentedControl: {
    // SegmentedControl fills the row
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  // Chat Room List
  roomsListContent: {
    paddingTop: 4,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 12,
    gap: 14,
    backgroundColor: 'transparent',
  },
  roomRowPressed: {
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(168,85,247,0.12)',
    marginLeft: DS.Spacing.lg + 56 + 14, // indent past avatar
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  roomAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  mixerRoomIcon: {
    fontSize: 24,
  },
  avatarUnreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: DS.Color.gelPurple,
    borderWidth: 2,
    borderColor: '#08050d',
  },

  // Room Content
  roomContent: {
    flex: 1,
    gap: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomName: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text2,
    flex: 1,
  },
  roomNameUnread: {
    color: DS.Color.text,
    fontWeight: '700',
  },
  roomTime: {
    fontSize: 12,
    color: DS.Color.text3,
    flexShrink: 0,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessage: {
    fontSize: 13,
    color: DS.Color.text3,
    flex: 1,
  },
  lastMessageUnread: {
    color: DS.Color.text2,
    fontWeight: '500',
  },
  unreadCountBubble: {
    backgroundColor: DS.Color.gelPurple,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mixerBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  mixerBadge: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.30)',
  },
  mixerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: DS.Color.gelPurple,
    letterSpacing: 0.2,
  },
  unreadBadgeInline: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
  },
  chevronText: {
    fontSize: 22,
    color: DS.Color.text3,
    fontWeight: '300',
  },

  // Empty State
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DS.Color.text3,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Requests Tab
  requestsScrollContent: {
    paddingBottom: 40,
  },
  requestsSection: {
    paddingHorizontal: DS.Spacing.lg,
    marginTop: 20,
  },
  markAllRow: {
    alignSelf: 'flex-end',
    marginRight: DS.Spacing.lg,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  markAllText: {
    color: DS.Color.gelPurple,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.Color.text2,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: DS.Color.gelPurple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Invites
  invitesList: {
    gap: 10,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inviterAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  inviterName: {
    color: DS.Color.text,
    fontWeight: '700',
  },
  inviteConnector: {
    color: DS.Color.text2,
  },
  groupName: {
    color: DS.Color.gelPurple,
    fontWeight: '700',
  },
  inviteTime: {
    fontSize: 12,
    color: DS.Color.text3,
    marginTop: 3,
  },
  messagePreview: {
    fontSize: 13,
    color: DS.Color.text3,
    fontStyle: 'italic',
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  acceptButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.Color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },

  // Notifications
  notificationsList: {
    gap: 8,
  },
  unreadCard: {
    borderColor: 'rgba(168,85,247,0.40)',
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.Color.glass,
    flexShrink: 0,
  },
  iconInvite: {
    backgroundColor: 'rgba(168,85,247,0.18)',
  },
  iconAccepted: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  iconDeclined: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.Color.text,
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 13,
    color: DS.Color.text2,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    color: DS.Color.text3,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.Color.gelPurple,
    marginTop: 4,
    flexShrink: 0,
  },
});
