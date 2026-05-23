import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Check, X, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground } from '@/components/gel';
import type { DirectMessage } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  return (
    (parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')
  ).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

// ─── Message bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  item: DirectMessage;
  isMe: boolean;
}

function MessageBubble({ item, isMe }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
      <View style={[styles.bubbleGroup, isMe && styles.bubbleGroupMe]}>
        {isMe ? (
          <LinearGradient
            colors={['#7C3AED', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleMe]}
          >
            <Text style={styles.bubbleTextMe}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleThem]}>
            <Text style={styles.bubbleTextThem}>{item.text}</Text>
          </View>
        )}

        <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

// ─── Pending Request Banner ──────────────────────────────────────────────────

interface PendingBannerProps {
  status: string;
  isRequester: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isPending: boolean;
}

function PendingBanner({ status, isRequester, onAccept, onDecline, isPending }: PendingBannerProps) {
  if (status !== 'pending') return null;

  if (isRequester) {
    return (
      <View style={styles.pendingBanner}>
        <Clock size={16} color={DS.Color.text2} />
        <Text style={styles.pendingBannerText}>
          Waiting for them to accept your message request
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.requestBanner}>
      <Text style={styles.requestBannerText}>
        This person wants to message you
      </Text>
      <View style={styles.requestActions}>
        <Pressable
          onPress={onAccept}
          disabled={isPending}
          style={[styles.acceptBtn, isPending && { opacity: 0.5 }]}
        >
          <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.acceptBtnText}>Accept</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={isPending}
          style={[styles.declineBtn, isPending && { opacity: 0.5 }]}
        >
          <X size={18} color={DS.Color.error} strokeWidth={2.5} />
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DMChatScreen() {
  const { conversationId, otherUserName, otherUserId } = useLocalSearchParams<{
    conversationId: string;
    otherUserName?: string;
    otherUserId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const profileId = profile?.id;

  const [text, setText] = useState<string>('');
  const flatListRef = useRef<FlatList<DirectMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['dm-messages', conversationId, profileId],
    queryFn: () => api.dm.getMessages(conversationId!, profileId!, { limit: 50 }),
    enabled: !!profileId && !!conversationId,
    refetchInterval: 3000,
  });

  const messages: DirectMessage[] = data?.messages ?? [];
  const conversationStatus = data?.status ?? 'pending';
  const invertedMessages = [...messages].reverse();

  // Determine if current user is the requester (sender of the request)
  // The requester can send messages even while pending
  const isRequester = messages.length > 0
    ? messages[0]?.senderId === profileId
    : true; // Default to requester if no messages

  // ── Accept/Decline mutations ────────────────────────────────────────────────
  const acceptMutation = useMutation({
    mutationFn: () => api.dm.acceptRequest(conversationId!, profileId!),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', profileId] });
    },
    onError: () => {
      Haptics.error();
      Alert.alert('Error', 'Could not accept request');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.dm.declineRequest(conversationId!, profileId!),
    onSuccess: () => {
      Haptics.success();
      router.back();
    },
    onError: () => {
      Haptics.error();
      Alert.alert('Error', 'Could not decline request');
    },
  });

  // ── Send mutation ────────────────────────────────────────────────────────────
  const { mutate: doSend, isPending: isSending } = useMutation({
    mutationFn: (msgText: string) =>
      api.dm.sendMessage(conversationId!, profileId!, msgText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations', profileId] });
    },
    onError: () => {
      Haptics.error();
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    Haptics.medium();
    setText('');
    doSend(trimmed);
  }, [text, isSending, doSend]);

  // Can only send if accepted, OR if you're the requester
  const canSend = conversationStatus === 'accepted' || isRequester;

  // ── Render item ──────────────────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: DirectMessage }) => {
      const isMe = item.senderId === profileId;
      return <MessageBubble item={item} isMe={isMe} />;
    },
    [profileId]
  );

  // ── Navigate to profile ──────────────────────────────────────────────────────
  const handleAvatarPress = () => {
    if (otherUserId) {
      Haptics.tap();
      router.push(`/profile/${otherUserId}`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <GelBackground>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => {
            Haptics.tap();
            router.back();
          }}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <Pressable onPress={handleAvatarPress} style={styles.headerCenter}>
          <LinearGradient
            colors={['#7C3AED', '#A855F7']}
            style={styles.headerAvatar}
          >
            <Text style={styles.headerAvatarText}>
              {getInitials(otherUserName)}
            </Text>
          </LinearGradient>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherUserName ?? 'Chat'}
          </Text>
        </Pressable>

        {/* Spacer so title is centred */}
        <View style={styles.backBtnSpacer} />
      </View>

      {/* Thin divider */}
      <View style={styles.divider} />

      {/* Pending request banner */}
      <PendingBanner
        status={conversationStatus}
        isRequester={isRequester}
        onAccept={() => acceptMutation.mutate()}
        onDecline={() => declineMutation.mutate()}
        isPending={acceptMutation.isPending || declineMutation.isPending}
      />

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={DS.Color.gelPurple} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList<DirectMessage>
            ref={flatListRef}
            data={invertedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  Send a message to start the conversation!
                </Text>
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        {canSend && (
          <View
            style={[
              styles.inputBar,
              { paddingBottom: insets.bottom + 8 },
            ]}
          >
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder="Message..."
                placeholderTextColor={DS.Color.text3}
                multiline
                maxLength={500}
                blurOnSubmit={false}
                onSubmitEditing={handleSend}
              />

              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || isSending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!text.trim() || isSending) && styles.sendBtnDisabled,
                  pressed && styles.sendBtnPressed,
                ]}
                hitSlop={4}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={16} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Show message when can't send */}
        {!canSend && conversationStatus === 'pending' && (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.waitingText}>
              Accept the request to reply
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </GelBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.normal,
    borderColor: DS.Color.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: {
    width: 38,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: DS.Font.size.lg,
    fontWeight: DS.Font.weight.bold,
    color: DS.Color.text,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.Color.divider,
  },

  // ── Pending banner ──
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: DS.Spacing.lg,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(168,85,247,0.2)',
  },
  pendingBannerText: {
    fontSize: 13,
    color: DS.Color.text2,
  },
  requestBanner: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: DS.Spacing.lg,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(168,85,247,0.2)',
    gap: 12,
  },
  requestBannerText: {
    fontSize: 14,
    color: DS.Color.text,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DS.Color.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  declineBtnText: {
    color: DS.Color.error,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: DS.Font.size.sm,
    color: DS.Color.text3,
  },

  // ── Messages list ──
  listContent: {
    paddingHorizontal: DS.Spacing.md,
    paddingVertical: DS.Spacing.md,
    gap: 2,
  },

  // ── Empty state ──
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: DS.Font.size.md,
    fontWeight: DS.Font.weight.semibold,
    color: DS.Color.text2,
  },
  emptySubtitle: {
    fontSize: DS.Font.size.sm,
    color: DS.Color.text3,
  },

  // ── Message rows ──
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    gap: 8,
  },
  rowMe: {
    justifyContent: 'flex-end',
  },
  rowThem: {
    justifyContent: 'flex-start',
  },

  // ── Bubble group ──
  bubbleGroup: {
    maxWidth: '78%',
    gap: 4,
  },
  bubbleGroupMe: {
    alignItems: 'flex-end',
  },

  // ── Bubbles ──
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    borderBottomLeftRadius: 4,
  },
  bubbleTextMe: {
    fontSize: DS.Font.size.md,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  bubbleTextThem: {
    fontSize: DS.Font.size.md,
    color: DS.Color.text,
    lineHeight: 21,
  },

  // ── Timestamp ──
  timestamp: {
    fontSize: 10,
    color: DS.Color.text3,
    marginLeft: 6,
  },
  timestampMe: {
    marginLeft: 0,
    marginRight: 6,
    textAlign: 'right',
  },

  // ── Input bar ──
  inputBar: {
    paddingHorizontal: DS.Spacing.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.Color.divider,
    backgroundColor: 'rgba(8,5,13,0.75)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: DS.Font.size.md,
    color: DS.Color.text,
    maxHeight: 120,
    paddingTop: 7,
    paddingBottom: 7,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: DS.Color.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  waitingText: {
    textAlign: 'center',
    color: DS.Color.text3,
    fontSize: 14,
    paddingVertical: 12,
  },
});
