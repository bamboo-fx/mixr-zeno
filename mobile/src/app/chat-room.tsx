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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Zap, GitPullRequestArrow, MapPin, MessageSquare, Check, X, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground } from '@/components/gel';
import type { ChatMessage } from '@/lib/types';

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isMixerRoom(name: string | undefined): boolean {
  return typeof name === 'string' && name.includes(' \u00d7 ');
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function SenderAvatar({ name }: { name: string }) {
  return (
    <LinearGradient
      colors={['#7C3AED', '#A855F7']}
      style={styles.avatar}
    >
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </LinearGradient>
  );
}

// ─── Change Request Bubble ────────────────────────────────────────────────────

interface ChangeRequestBubbleProps {
  item: ChatMessage;
  profileId: string;
  onRespond: (crId: string, response: 'accepted' | 'declined') => void;
  isResponding: boolean;
}

function ChangeRequestBubble({ item, profileId, onRespond, isResponding }: ChangeRequestBubbleProps) {
  const cr = item.changeRequest;
  if (!cr) return null;

  // Once resolved, remove the card from the chat entirely
  if (cr.status !== 'pending') return null;

  // The sender cannot respond — only the other group's social chair can
  const isMine = item.senderId === profileId;

  const endTime = cr.proposedEnd
    ? ' – ' + new Date(cr.proposedEnd).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <View style={crStyles.wrapper}>
      {/* Header row */}
      <View style={crStyles.headerRow}>
        <GitPullRequestArrow size={14} color="#A855F7" strokeWidth={2} />
        <Text style={crStyles.title}>Change Requested</Text>
        <View style={[crStyles.statusBadge, { backgroundColor: '#A855F722', borderColor: '#A855F755' }]}>
          <Text style={[crStyles.statusText, { color: '#A855F7' }]}>Pending</Text>
        </View>
      </View>

      {/* Details */}
      <View style={crStyles.details}>
        <View style={crStyles.detailRow}>
          <Calendar size={13} color={DS.Color.text3} />
          <Text style={crStyles.detailText}>
            {formatDateTime(cr.proposedStart)}{endTime}
          </Text>
        </View>
        <View style={crStyles.detailRow}>
          <MapPin size={13} color={DS.Color.text3} />
          <Text style={crStyles.detailText}>{cr.proposedLocation}</Text>
        </View>
        {cr.message && (
          <View style={crStyles.detailRow}>
            <MessageSquare size={13} color={DS.Color.text3} />
            <Text style={crStyles.detailText}>"{cr.message}"</Text>
          </View>
        )}
      </View>

      {/* Accept / Decline — only shown to the other group's social chair */}
      {!isMine && (
        <View style={crStyles.actions}>
          <Pressable
            onPress={() => { Haptics.medium(); onRespond(cr.id, 'accepted'); }}
            disabled={isResponding}
            style={({ pressed }) => [crStyles.acceptBtn, pressed && { opacity: 0.75 }]}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={crStyles.acceptText}>Accept</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => { Haptics.tap(); onRespond(cr.id, 'declined'); }}
            disabled={isResponding}
            style={({ pressed }) => [crStyles.declineBtn, pressed && { opacity: 0.75 }]}
          >
            <X size={14} color="#EF4444" strokeWidth={2.5} />
            <Text style={crStyles.declineText}>Decline</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const crStyles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    marginHorizontal: 4,
    backgroundColor: 'rgba(20,12,35,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#A855F7',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DS.Color.text,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#166534',
    borderWidth: 1,
    borderColor: '#22C55E44',
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#1f0707',
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});

// ─── Message bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  item: ChatMessage;
  isMe: boolean;
  showSender: boolean;
  profileId: string;
  mixerId?: string;
  onRespond: (crId: string, response: 'accepted' | 'declined') => void;
  isResponding: boolean;
}

function MessageBubble({ item, isMe, showSender, profileId, mixerId, onRespond, isResponding }: MessageBubbleProps) {
  if (item.messageType === 'change_request' && mixerId) {
    return (
      <ChangeRequestBubble
        item={item}
        profileId={profileId}
        onRespond={onRespond}
        isResponding={isResponding}
      />
    );
  }

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
      {!isMe && (
        <View style={styles.avatarSlot}>
          {showSender ? <SenderAvatar name={item.sender.name} /> : null}
        </View>
      )}

      <View style={[styles.bubbleGroup, isMe && styles.bubbleGroupMe]}>
        {showSender && !isMe && (
          <Text style={styles.senderName}>{item.sender.name}</Text>
        )}

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatRoomScreen() {
  const { roomId, roomName, mixerId } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
    mixerId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const profileId = profile?.id;

  const [text, setText] = useState<string>('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const [respondingCrId, setRespondingCrId] = useState<string | null>(null);

  const isMixer = isMixerRoom(roomName);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['chat-messages', roomId, profileId],
    queryFn: () => api.chat.getMessages(roomId!, profileId!, { limit: 50 }),
    enabled: !!profileId && !!roomId,
    refetchInterval: 3000,
  });

  const messages: ChatMessage[] = data?.messages ?? [];
  const invertedMessages = [...messages].reverse();

  // ── Send mutation ────────────────────────────────────────────────────────────
  const { mutate: doSend, isPending: isSending } = useMutation({
    mutationFn: (msgText: string) =>
      api.chat.sendMessage(roomId!, profileId!, msgText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', profileId] });
    },
    onError: () => { Haptics.error(); },
  });

  // ── Respond to change request mutation ───────────────────────────────────────
  const { mutate: doRespond } = useMutation({
    mutationFn: ({ crId, response }: { crId: string; response: 'accepted' | 'declined' }) =>
      api.mixers.respondToChangeRequest(mixerId!, crId, { response, responderId: profileId! }),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['mixer', mixerId] });
    },
    onError: () => { Haptics.error(); },
    onSettled: () => { setRespondingCrId(null); },
  });

  const handleRespond = useCallback((crId: string, response: 'accepted' | 'declined') => {
    if (!mixerId || !profileId) return;
    setRespondingCrId(crId);
    doRespond({ crId, response });
  }, [mixerId, profileId, doRespond]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    Haptics.medium();
    setText('');
    doSend(trimmed);
  }, [text, isSending, doSend]);

  // ── Render item ──────────────────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMe = item.senderId === profileId;
      const nextItem = invertedMessages[index + 1];
      const showSender = !isMe && nextItem?.senderId !== item.senderId;
      return (
        <MessageBubble
          item={item}
          isMe={isMe}
          showSender={showSender}
          profileId={profileId!}
          mixerId={mixerId}
          onRespond={handleRespond}
          isResponding={respondingCrId === item.changeRequestId}
        />
      );
    },
    [invertedMessages, profileId, mixerId, handleRespond, respondingCrId]
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <GelBackground>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => { Haptics.tap(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerCenter}>
          {isMixer && (
            <View style={styles.zapBadge}>
              <Zap size={11} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName ?? 'Chat'}
          </Text>
        </View>

        <View style={styles.backBtnSpacer} />
      </View>

      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={DS.Color.gelPurple} />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList<ChatMessage>
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
                <Text style={styles.emptySubtitle}>Be the first to say something!</Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
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
      </KeyboardAvoidingView>
    </GelBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: DS.Color.glass,
    borderWidth: DS.Stroke.normal, borderColor: DS.Color.stroke,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnSpacer: { width: 38 },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  zapBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: DS.Color.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: DS.Font.size.lg, fontWeight: DS.Font.weight.bold, color: DS.Color.text, flexShrink: 1,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: DS.Color.divider },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: DS.Font.size.sm, color: DS.Color.text3 },

  listContent: { paddingHorizontal: DS.Spacing.md, paddingVertical: DS.Spacing.md, gap: 2 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: DS.Font.size.md, fontWeight: DS.Font.weight.semibold, color: DS.Color.text2 },
  emptySubtitle: { fontSize: DS.Font.size.sm, color: DS.Color.text3 },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3, gap: 8 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },

  avatarSlot: { width: 30, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  bubbleGroup: { maxWidth: '74%', gap: 4 },
  bubbleGroupMe: { alignItems: 'flex-end' },

  senderName: {
    fontSize: 11, fontWeight: DS.Font.weight.semibold, color: DS.Color.gelPurple, marginLeft: 4, letterSpacing: 0.2,
  },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    borderBottomLeftRadius: 4,
  },
  bubbleTextMe: { fontSize: DS.Font.size.md, color: '#FFFFFF', lineHeight: 21 },
  bubbleTextThem: { fontSize: DS.Font.size.md, color: DS.Color.text, lineHeight: 21 },

  timestamp: { fontSize: 10, color: DS.Color.text3, marginLeft: 6 },
  timestampMe: { marginLeft: 0, marginRight: 6, textAlign: 'right' },

  inputBar: {
    paddingHorizontal: DS.Spacing.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.Color.divider,
    backgroundColor: 'rgba(8,5,13,0.75)',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 6,
  },
  textInput: {
    flex: 1, fontSize: DS.Font.size.md, color: DS.Color.text, maxHeight: 120, paddingTop: 7, paddingBottom: 7,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: DS.Color.purple,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: DS.Color.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(124,58,237,0.25)', shadowOpacity: 0, elevation: 0 },
  sendBtnPressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
});
