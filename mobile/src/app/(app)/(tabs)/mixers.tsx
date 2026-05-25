import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Image,
  Modal,
  ActionSheetIOS,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Sparkles,
  Calendar,
  MapPin,
  Inbox,
  Send,
  CheckCircle2,
  ArrowRight,
  Star,
  Clock,
  Plus,
  Users,
  Zap,
  ChevronDown,
  Check,
  X,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import { NotificationBell } from '@/components/NotificationBell';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Mixer, MixerRequest, MixerStatus, AvailableRecap, InboundMixerRequest, OutboundMixerRequest, MixerRequestsForGroup } from '@/lib/types';

import { GelBackground, GelCard, GelButton, MetalButton, GelSegmentedControl } from '@/components/gel';
import { MixerCard } from '@/components/MixerCard';
import { SkeletonCard } from '@/components/Skeleton';
import { EmptyState, VennDiagramIcon } from '@/components/EmptyState';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { MixerRecapCard } from '@/components/MixerRecapCard';
import { MixerRatingModal } from '@/components/MixerRatingModal';
import { LiveActivationModal } from '@/components/mixer/LiveActivationModal';
import { MixerIcon } from '@/components/MixerIcon';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { colors as C, fonts as F } from '@/lib/theme';
import { HeaderBackdrop } from '@/components/HeaderBackdrop';
import type { MixerStatus as MixerStatusBadge } from '@/components/StatusBadge';

// App logo for header
const MIXR_LOGO = require('../../../../assets/images/mixr-logo-header.png');
// Large logo for no-groups state
const MIXR_LOGO_LARGE = require('../../../../assets/images/mixr-logo-large.png');

// Steps for How Mixers Work
const STEPS = [
  { number: '1', title: 'Join a Group', subtitle: 'Find your crew or create one' },
  { number: '2', title: 'Discover Groups', subtitle: 'Browse groups you want to meet' },
  { number: '3', title: 'Send Invite', subtitle: 'Request a mixer with them' },
  { number: '4', title: 'Mix It Up!', subtitle: 'Meet IRL with a fun activity' },
];

type TabType = 'active' | 'requests' | 'history';
const SEGMENTS = ['Upcoming', 'Requests', 'Past'];

// ─────────────────────────────────────────────────────────────────────────────
// LivePulseBadge
// ─────────────────────────────────────────────────────────────────────────────
function LivePulseBadge() {
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    );
    dotLoop.start();
    glowLoop.start();
    return () => { dotLoop.stop(); glowLoop.stop(); };
  }, [pulseOpacity, glowOpacity]);

  return (
    <View style={styles.liveBadge}>
      {/* Glow halo behind the dot */}
      <Animated.View style={[styles.liveGlow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.liveDot, { opacity: pulseOpacity }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel — small section header
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <View style={styles.sectionLabel}>
      {icon}
      <Text style={[styles.sectionLabelText, { color }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IncomingRequestCard
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// RequestDetailModal — full details sheet for any request card
// ─────────────────────────────────────────────────────────────────────────────
function RequestDetailModal({
  visible,
  onClose,
  title,
  subtitle,
  accentColor,
  details,
  message,
  statusBanner,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor: string;
  details: Array<{ icon: React.ReactNode; text: string }>;
  message?: string | null;
  statusBanner?: { text: string; color: string } | null;
  actions?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        overflow: 'hidden',
      }}>
        <BlurView intensity={70} tint="dark" style={{ padding: 24, paddingBottom: 40 }}>
          {/* Drag handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 }} />

          {/* Accent header */}
          <LinearGradient
            colors={[accentColor + 'CC', accentColor + '66', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: accentColor }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3, marginBottom: subtitle ? 4 : 0 }}>{title}</Text>
            {subtitle ? <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600' }}>{subtitle}</Text> : null}
          </LinearGradient>

          {/* Detail rows */}
          <View style={{ gap: 12, marginBottom: 16 }}>
            {details.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {d.icon}
                <Text style={{ color: DS.Color.text2, fontSize: 14, fontWeight: '600', flex: 1 }}>{d.text}</Text>
              </View>
            ))}
          </View>

          {message ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: DS.Color.text2, fontSize: 14, fontStyle: 'italic' }}>"{message}"</Text>
            </View>
          ) : null}

          {statusBanner ? (
            <View style={{ backgroundColor: statusBanner.color + '18', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: statusBanner.color + '44' }}>
              <Text style={{ color: statusBanner.color, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{statusBanner.text}</Text>
            </View>
          ) : null}

          {actions}
        </BlurView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IncomingRequestCard
// ─────────────────────────────────────────────────────────────────────────────
function IncomingRequestCard({
  request,
  onAccept,
  onCounter,
  onDecline,
  isPending,
}: {
  request: MixerRequest;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
  isPending: boolean;
}) {
  const [detailVisible, setDetailVisible] = useState(false);
  const fromGroupName = request.requestingGroup?.name ?? 'Unknown Group';
  const toGroupName = request.receivingGroup?.name ?? 'Your Group';
  const accentColor = '#FF6B6B';

  const dateStr = format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a') +
    (request.proposedEnd ? ` → ${format(new Date(request.proposedEnd), 'h:mm a')}` : '');

  const details = [
    { icon: <Calendar size={15} color={DS.Color.text3} />, text: dateStr },
    { icon: <MapPin size={15} color={DS.Color.text3} />, text: request.proposedLocation },
    ...(request.proposedActivity ? [{ icon: <Sparkles size={15} color={DS.Color.text3} />, text: request.proposedActivity.name }] : []),
    { icon: <Clock size={15} color={DS.Color.text3} />, text: `Sent ${format(new Date(request.createdAt), 'MMM d')}` },
  ];

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        <View style={{ borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient
            colors={['rgba(255,107,107,0.12)', 'rgba(255,107,107,0.04)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(255,107,107,0.25)' }}
          >
            {/* Left accent bar */}
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />
            <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: 'rgba(255,107,107,0.8)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>Incoming Request</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>
                  {fromGroupName} → {toGroupName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Calendar size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }}>{format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{request.proposedLocation}</Text>
                </View>
              </View>
              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                <ChevronRight size={16} color={DS.Color.text3} />
              </View>
            </View>
            {/* Action row inline */}
            <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', marginHorizontal: 14 }}>
              <Pressable onPress={() => { Haptics.tap(); onDecline(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Decline</Text>
              </Pressable>
              <View style={{ width: 0.5, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <Pressable onPress={() => { Haptics.medium(); onCounter(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>Counter</Text>
              </Pressable>
              <View style={{ width: 0.5, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <Pressable onPress={() => { Haptics.success(); onAccept(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                {isPending ? <ActivityIndicator size="small" color="#3AE3A0" /> : (
                  <Text style={{ color: '#3AE3A0', fontSize: 13, fontWeight: '800' }}>Accept</Text>
                )}
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </Pressable>

      <RequestDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        title={`${fromGroupName} → ${toGroupName}`}
        subtitle="Incoming mixer request"
        accentColor={accentColor}
        details={details}
        message={request.message}
        actions={
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable onPress={() => { setDetailVisible(false); onDecline(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.35)', alignItems: 'center' }}>
              <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>Decline</Text>
            </Pressable>
            <Pressable onPress={() => { setDetailVisible(false); onCounter(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 0.5, borderColor: 'rgba(245,158,11,0.35)', alignItems: 'center' }}>
              <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 15 }}>Counter</Text>
            </Pressable>
            <Pressable onPress={() => { setDetailVisible(false); onAccept(); }} disabled={isPending} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={['#3AE3A0', '#28C988']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, alignItems: 'center' }}>
                {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Accept</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        }
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiGroupIncomingRequestCard
// ─────────────────────────────────────────────────────────────────────────────
function MultiGroupIncomingRequestCard({
  request,
  onAccept,
  onDecline,
  isPending,
  canRespond,
  groupName,
}: {
  request: InboundMixerRequest;
  onAccept: () => void;
  onDecline: () => void;
  isPending: boolean;
  canRespond: boolean;
  groupName?: string;
}) {
  const [detailVisible, setDetailVisible] = useState(false);
  const fromGroupName = request.requesterGroup?.name ?? 'Unknown Group';
  const alsoInvited = request.alsoInvited ?? [];
  const accentColor = '#FF6B6B';

  const alsoInvitedText = alsoInvited.length === 0 ? null
    : alsoInvited.length <= 3 ? alsoInvited.map((g) => g.groupName).join(', ')
    : `${alsoInvited.slice(0, 3).map((g) => g.groupName).join(', ')} +${alsoInvited.length - 3} more`;

  const dateStr = format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a');
  const details = [
    { icon: <Calendar size={15} color={DS.Color.text3} />, text: dateStr },
    { icon: <MapPin size={15} color={DS.Color.text3} />, text: request.proposedLocation },
    ...(request.proposedActivity ? [{ icon: <Sparkles size={15} color={DS.Color.text3} />, text: request.proposedActivity.name }] : []),
    ...(alsoInvitedText ? [{ icon: <Users size={15} color={DS.Color.gelPurple} />, text: `Also invited: ${alsoInvitedText}` }] : []),
  ];

  const statusBanner = request.myStatus !== 'pending'
    ? { text: request.myStatus === 'accepted' ? 'You accepted this request' : 'You declined this request', color: request.myStatus === 'accepted' ? '#22C55E' : '#EF4444' }
    : request.myStatus === 'pending' && !canRespond
    ? { text: 'Awaiting response from group admin', color: '#F59E0B' }
    : null;

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        <View style={{ borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient
            colors={['rgba(255,107,107,0.12)', 'rgba(255,107,107,0.04)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(255,107,107,0.25)' }}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />
            <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                {groupName && <Text style={{ color: 'rgba(255,107,107,0.8)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>{groupName}</Text>}
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>
                  {fromGroupName} wants to mix
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Calendar size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }}>{dateStr}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{request.proposedLocation}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={DS.Color.text3} />
            </View>
            {request.myStatus === 'pending' && canRespond && (
              <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', marginHorizontal: 14 }}>
                <Pressable onPress={() => { Haptics.tap(); onDecline(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Decline</Text>
                </Pressable>
                <View style={{ width: 0.5, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <Pressable onPress={() => { Haptics.success(); onAccept(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                  {isPending ? <ActivityIndicator size="small" color="#3AE3A0" /> : (
                    <Text style={{ color: '#3AE3A0', fontSize: 13, fontWeight: '800' }}>Accept</Text>
                  )}
                </Pressable>
              </View>
            )}
          </LinearGradient>
        </View>
      </Pressable>

      <RequestDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        title={`${fromGroupName} wants to mix`}
        subtitle={groupName ? `To: ${groupName}` : undefined}
        accentColor={accentColor}
        details={details}
        message={request.message}
        statusBanner={statusBanner}
        actions={request.myStatus === 'pending' && canRespond ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable onPress={() => { setDetailVisible(false); onDecline(); }} disabled={isPending} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.35)', alignItems: 'center' }}>
              <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>Decline</Text>
            </Pressable>
            <Pressable onPress={() => { setDetailVisible(false); onAccept(); }} disabled={isPending} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={['#3AE3A0', '#28C988']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, alignItems: 'center' }}>
                {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Accept</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        ) : undefined}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiGroupSentRequestCard
// ─────────────────────────────────────────────────────────────────────────────
function MultiGroupSentRequestCard({
  request,
  onCancel,
  isCancelling,
  onDismiss,
  isDismissing,
}: {
  request: OutboundMixerRequest;
  onCancel: () => void;
  isCancelling: boolean;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  const [detailVisible, setDetailVisible] = useState(false);
  const invitedGroups = request.invitedGroups ?? [];
  const isPending = request.requestStatus === 'pending';
  const isDone = !isPending && request.requestStatus !== 'active';
  const accentColor = isPending ? '#3AE3A0' : request.requestStatus === 'active' ? '#22C55E' : '#6B7280';

  const statusLabel = request.requestStatus === 'pending'
    ? `${request.pendingCount} awaiting`
    : request.requestStatus === 'active' ? 'Confirmed'
    : request.requestStatus === 'expired' ? 'Declined'
    : 'Cancelled';
  const statusColor = request.requestStatus === 'active' ? '#22C55E'
    : request.requestStatus === 'expired' ? '#EF4444'
    : request.requestStatus === 'pending' ? '#3AE3A0'
    : DS.Color.text3;

  const dateStr = format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a')
    + (request.proposedEnd ? ` → ${format(new Date(request.proposedEnd), 'h:mm a')}` : '');

  const details = [
    { icon: <Calendar size={15} color={DS.Color.text3} />, text: dateStr },
    { icon: <MapPin size={15} color={DS.Color.text3} />, text: request.proposedLocation },
    ...(request.proposedActivity ? [{ icon: <Sparkles size={15} color={DS.Color.text3} />, text: request.proposedActivity.name }] : []),
    { icon: <Clock size={15} color={DS.Color.text3} />, text: `Sent ${format(new Date(request.createdAt), 'MMM d')}` },
  ];

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        <View style={{ borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient
            colors={[accentColor + '18', accentColor + '06']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 18, borderWidth: 0.5, borderColor: accentColor + '33' }}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />
            <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: accentColor + 'CC', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {request.requesterGroup.name} · Sent
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>
                  To {invitedGroups.length} {invitedGroups.length === 1 ? 'group' : 'groups'}: {invitedGroups.map(g => g.groupName).join(', ')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Calendar size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }}>{format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{request.proposedLocation}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: statusColor + '20' }}>
                  <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{statusLabel}</Text>
                </View>
                <ChevronRight size={16} color={DS.Color.text3} />
              </View>
            </View>
            {/* Invite status dots */}
            {invitedGroups.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 18, paddingBottom: 12 }}>
                {invitedGroups.map((g) => {
                  const c = g.status === 'accepted' ? '#22C55E' : g.status === 'declined' ? '#EF4444' : DS.Color.text3;
                  return (
                    <View key={g.inviteId} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: c + '18' }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c }} />
                      <Text style={{ color: c, fontSize: 11, fontWeight: '700' }}>{g.groupName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {/* Cancel/dismiss row */}
            {(isPending || isDone) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', marginHorizontal: 14 }}>
                {isPending ? (
                  <Pressable onPress={() => { Haptics.tap(); onCancel(); }} disabled={isCancelling} style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    {isCancelling
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <><Trash2 size={13} color="#EF4444" /><Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Cancel Request</Text></>
                    }
                  </Pressable>
                ) : (
                  <Pressable onPress={() => { Haptics.tap(); onDismiss(); }} disabled={isDismissing} style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    {isDismissing
                      ? <ActivityIndicator size="small" color={DS.Color.text3} />
                      : <><X size={13} color={DS.Color.text3} /><Text style={{ color: DS.Color.text3, fontSize: 13, fontWeight: '700' }}>Clear</Text></>
                    }
                  </Pressable>
                )}
              </View>
            )}
          </LinearGradient>
        </View>
      </Pressable>

      <RequestDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        title={`Sent to ${invitedGroups.length} ${invitedGroups.length === 1 ? 'group' : 'groups'}`}
        subtitle={invitedGroups.map(g => g.groupName).join(', ')}
        accentColor={accentColor}
        details={details}
        message={request.message}
        statusBanner={{ text: statusLabel, color: statusColor }}
        actions={isPending ? (
          <Pressable onPress={() => { setDetailVisible(false); onCancel(); }} disabled={isCancelling} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.35)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isCancelling ? <ActivityIndicator size="small" color="#EF4444" /> : <><Trash2 size={16} color="#EF4444" /><Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>Cancel Request</Text></>}
          </Pressable>
        ) : isDone ? (
          <Pressable onPress={() => { setDetailVisible(false); onDismiss(); }} disabled={isDismissing} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isDismissing ? <ActivityIndicator size="small" color={DS.Color.text3} /> : <><X size={16} color={DS.Color.text3} /><Text style={{ color: DS.Color.text3, fontWeight: '800', fontSize: 15 }}>Clear from List</Text></>}
          </Pressable>
        ) : undefined}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SentRequestCard (legacy single-group)
// ─────────────────────────────────────────────────────────────────────────────
function SentRequestCard({
  request,
  onCancel,
  isCancelling,
  onDismiss,
  isDismissing,
}: {
  request: MixerRequest;
  onCancel: () => void;
  isCancelling: boolean;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  const [detailVisible, setDetailVisible] = useState(false);
  const toGroupName = request.receivingGroup?.name ?? 'Unknown Group';
  const isPending = request.status === 'pending';
  const isDone = !isPending && request.status !== 'accepted' && request.status !== 'countered';
  const accentColor = request.status === 'accepted' ? '#22C55E'
    : request.status === 'declined' ? '#EF4444'
    : request.status === 'countered' ? '#F59E0B'
    : '#3AE3A0';
  const statusLabel = request.status === 'pending' ? 'Awaiting'
    : request.status === 'accepted' ? 'Accepted'
    : request.status === 'declined' ? 'Declined'
    : request.status === 'countered' ? 'Countered'
    : 'Cancelled';

  const dateStr = format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a')
    + (request.proposedEnd ? ` → ${format(new Date(request.proposedEnd), 'h:mm a')}` : '');

  const details = [
    { icon: <Calendar size={15} color={DS.Color.text3} />, text: dateStr },
    { icon: <MapPin size={15} color={DS.Color.text3} />, text: request.proposedLocation },
    ...(request.proposedActivity ? [{ icon: <Sparkles size={15} color={DS.Color.text3} />, text: request.proposedActivity.name }] : []),
    { icon: <Clock size={15} color={DS.Color.text3} />, text: `Sent ${format(new Date(request.createdAt), 'MMM d')}` },
  ];

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        <View style={{ borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient
            colors={[accentColor + '18', accentColor + '06']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 18, borderWidth: 0.5, borderColor: accentColor + '33' }}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />
            <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: accentColor + 'CC', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>Sent Request</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>To: {toGroupName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Calendar size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }}>{format(new Date(request.proposedStart), 'EEE, MMM d • h:mm a')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={11} color={DS.Color.text3} />
                  <Text style={{ color: DS.Color.text3, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{request.proposedLocation}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: accentColor + '20' }}>
                  <Text style={{ color: accentColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{statusLabel}</Text>
                </View>
                <ChevronRight size={16} color={DS.Color.text3} />
              </View>
            </View>
            {(isPending || isDone) && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', marginHorizontal: 14 }}>
                {isPending ? (
                  <Pressable onPress={() => { Haptics.tap(); onCancel(); }} disabled={isCancelling} style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    {isCancelling
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <><Trash2 size={13} color="#EF4444" /><Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Cancel Request</Text></>
                    }
                  </Pressable>
                ) : (
                  <Pressable onPress={() => { Haptics.tap(); onDismiss(); }} disabled={isDismissing} style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    {isDismissing
                      ? <ActivityIndicator size="small" color={DS.Color.text3} />
                      : <><X size={13} color={DS.Color.text3} /><Text style={{ color: DS.Color.text3, fontSize: 13, fontWeight: '700' }}>Clear</Text></>
                    }
                  </Pressable>
                )}
              </View>
            )}
          </LinearGradient>
        </View>
      </Pressable>

      <RequestDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        title={`To: ${toGroupName}`}
        subtitle={request.requestingGroup?.name ? `From ${request.requestingGroup.name}` : undefined}
        accentColor={accentColor}
        details={details}
        message={request.message}
        statusBanner={{ text: statusLabel, color: accentColor }}
        actions={isPending ? (
          <Pressable onPress={() => { setDetailVisible(false); onCancel(); }} disabled={isCancelling} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.35)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isCancelling ? <ActivityIndicator size="small" color="#EF4444" /> : <><Trash2 size={16} color="#EF4444" /><Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>Cancel Request</Text></>}
          </Pressable>
        ) : isDone ? (
          <Pressable onPress={() => { setDetailVisible(false); onDismiss(); }} disabled={isDismissing} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isDismissing ? <ActivityIndicator size="small" color={DS.Color.text3} /> : <><X size={16} color={DS.Color.text3} /><Text style={{ color: DS.Color.text3, fontWeight: '800', fontSize: 15 }}>Clear from List</Text></>}
          </Pressable>
        ) : undefined}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryMixerCard
// ─────────────────────────────────────────────────────────────────────────────
function HistoryMixerCard({ mixer, onRate, myGroupIds }: { mixer: Mixer; onRate: (groupId: string) => void; myGroupIds: string[] }) {
  const groupAName = mixer.groupA?.name ?? 'Group A';
  const groupBName = mixer.groupB?.name ?? 'Group B';

  const inGroupA = mixer.groupA?.id ? myGroupIds.includes(mixer.groupA.id) : false;
  const inGroupB = mixer.groupB?.id ? myGroupIds.includes(mixer.groupB.id) : false;
  // If in both groups, can't rate either. Otherwise rate only the opposing group.
  const canRateA = !inGroupA && inGroupB;
  const canRateB = !inGroupB && inGroupA;

  return (
    <GelCard>
      <View style={{ gap: DS.Spacing.md, opacity: 0.85 }}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { flex: 1, marginRight: 8, fontSize: 15 }]} numberOfLines={1}>
            {groupAName} × {groupBName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {mixer.avgRating !== null && mixer.avgRating !== undefined && (
              <View style={styles.ratingChip}>
                <Star size={11} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingChipText}>{Math.round(mixer.avgRating / 2)}/5</Text>
              </View>
            )}
            <View style={[styles.statusPill, { backgroundColor: DS.Color.panel2 }]}>
              <Text style={[styles.statusPillText, { color: DS.Color.text3 }]}>
                {mixer.status === 'cancelled' ? 'CANCELLED' : 'COMPLETED'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 5 }}>
          <View style={styles.detailRow}>
            <Calendar size={12} color={DS.Color.text3} />
            <Text style={styles.detailTextSm}>
              {format(new Date(mixer.scheduledStart), 'EEE, MMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={12} color={DS.Color.text3} />
            <Text style={styles.detailTextSm}>{mixer.location}</Text>
          </View>
        </View>

        {mixer.status === 'completed' && (canRateA || canRateB) && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canRateA && mixer.groupA?.id && (
              <Pressable
                onPress={() => { Haptics.tap(); onRate(mixer.groupA!.id); }}
                style={styles.rateButton}
              >
                <Star size={13} color="#F59E0B" />
                <Text style={styles.rateButtonText} numberOfLines={1}>
                  Rate {groupAName}
                </Text>
              </Pressable>
            )}
            {canRateB && mixer.groupB?.id && (
              <Pressable
                onPress={() => { Haptics.tap(); onRate(mixer.groupB!.id); }}
                style={styles.rateButton}
              >
                <Star size={13} color="#F59E0B" />
                <Text style={styles.rateButtonText} numberOfLines={1}>
                  Rate {groupBName}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </GelCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupSelectorDropdown
// ─────────────────────────────────────────────────────────────────────────────
function GroupSelectorDropdown({
  groups,
  selectedGroupId,
  onSelect,
}: {
  groups: { id: string; name: string; coverImageUrl?: string | null }[];
  selectedGroupId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animHeight, {
        toValue: open ? Math.min(groups.length + 1, 6) * 52 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(animOpacity, {
        toValue: open ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [open, groups.length]);

  const handleSelect = (id: string | null) => {
    Haptics.tap();
    onSelect(id);
    setOpen(false);
  };

  const options = [
    { id: null, name: 'All Groups', coverImageUrl: null },
    ...groups,
  ];

  return (
    <View style={groupSelectorStyles.container}>
      {/* Trigger pill */}
      <Pressable
        onPress={() => { Haptics.tap(); setOpen((v) => !v); }}
        style={({ pressed }) => [
          groupSelectorStyles.trigger,
          pressed && { opacity: 0.75 },
        ]}
      >
        <BlurView intensity={50} tint="dark" style={groupSelectorStyles.triggerBlur}>
          <LinearGradient
            colors={['rgba(168,85,247,0.14)', 'rgba(124,58,237,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Left: avatar or all-groups icon */}
          {selectedGroup?.coverImageUrl ? (
            <Image
              source={{ uri: selectedGroup.coverImageUrl }}
              style={groupSelectorStyles.triggerAvatar}
            />
          ) : (
            <View style={groupSelectorStyles.triggerAvatarFallback}>
              <Users size={12} color="#3AE3A0" strokeWidth={2} />
            </View>
          )}
          <Text style={groupSelectorStyles.triggerLabel} numberOfLines={1}>
            {selectedGroup?.name ?? 'All Groups'}
          </Text>
          <Animated.View style={{
            transform: [{ rotate: animOpacity.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }],
          }}>
            <ChevronDown size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
          </Animated.View>
        </BlurView>
      </Pressable>

      {/* Dropdown list */}
      <Animated.View style={[groupSelectorStyles.dropdown, { height: animHeight, opacity: animOpacity }]}>
        <BlurView intensity={65} tint="dark" style={groupSelectorStyles.dropdownBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ScrollView
            scrollEnabled={groups.length >= 5}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.id === selectedGroupId;
              const isLast = idx === options.length - 1;
              return (
                <Pressable
                  key={opt.id ?? '__all__'}
                  onPress={() => handleSelect(opt.id)}
                  style={({ pressed }) => [
                    groupSelectorStyles.dropdownItem,
                    !isLast && groupSelectorStyles.dropdownItemBorder,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  {opt.coverImageUrl ? (
                    <Image
                      source={{ uri: opt.coverImageUrl }}
                      style={groupSelectorStyles.dropdownAvatar}
                    />
                  ) : (
                    <View style={[
                      groupSelectorStyles.dropdownAvatarFallback,
                      opt.id === null && { backgroundColor: 'rgba(168,85,247,0.15)' },
                    ]}>
                      <Users size={12} color={opt.id === null ? '#3AE3A0' : 'rgba(255,255,255,0.4)'} strokeWidth={2} />
                    </View>
                  )}
                  <Text style={[
                    groupSelectorStyles.dropdownItemText,
                    isSelected && groupSelectorStyles.dropdownItemTextActive,
                  ]} numberOfLines={1}>
                    {opt.name}
                  </Text>
                  {isSelected && (
                    <Check size={14} color="#3AE3A0" strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </BlurView>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NoGroupsOnboarding — Apple-style "How Mixers Work"
// ─────────────────────────────────────────────────────────────────────────────
function NoGroupsOnboarding({ onBrowse, onCreate }: { onBrowse: () => void; onCreate: () => void }) {
  return (
    <View style={styles.onboardingWrap}>
      {/* Icon */}
      <View style={styles.onboardingIconWrap}>
        <LinearGradient
          colors={['#3AE3A0', '#28C988']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.onboardingIconGrad}
        >
          <MixerIcon size={30} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </View>

      <Text style={styles.onboardingTitle}>Ready to Mix?</Text>
      <Text style={styles.onboardingSubtitle}>
        Join a group at your college to start sending and receiving mixer invites.
      </Text>

      {/* CTA Buttons */}
      <View style={styles.ctaButtonsRow}>
        <View style={{ flex: 1 }}>
          <GelButton
            title="Browse Groups"
            variant="secondary"
            fullWidth
            leftIcon={<Users size={17} color={DS.Color.text2} />}
            onPress={() => { Haptics.tap(); onBrowse(); }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetalButton
            variant="primary"
            fullWidth
            onPress={() => { Haptics.tap(); onCreate(); }}
          >
            <Plus size={17} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Create Group</Text>
          </MetalButton>
        </View>
      </View>

      {/* How Mixers Work */}
      <View style={styles.stepsSection}>
        <View style={styles.stepsSectionHeader}>
          <Text style={styles.stepsSectionTitle}>How Mixers Work</Text>
        </View>

        {STEPS.map((step, i) => (
          <View key={step.number} style={styles.stepItem}>
            {/* Number badge */}
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeNum}>{step.number}</Text>
            </View>

            {/* Connector line (except last) */}
            {i < STEPS.length - 1 && <View style={styles.stepConnector} />}

            {/* Content — glass card */}
            <BlurView
              intensity={40}
              tint="dark"
              style={styles.stepContent}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            </BlurView>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MixersScreen — main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function MixersScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mixers'] }),
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['available-recaps'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingMixer, setRatingMixer] = useState<Mixer | null>(null);
  const [ratingGroupId, setRatingGroupId] = useState<string | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Live Activation Modal state
  const [activationModalMixer, setActivationModalMixer] = useState<Mixer | null>(null);
  const [activationDismissedIds, setActivationDismissedIds] = useState<Set<string>>(new Set());

  // Group picker modal for "Request Mixer" (Android fallback)

  const selectedTab: TabType = selectedIndex === 0 ? 'active' : selectedIndex === 1 ? 'requests' : 'history';

  const myGroupIds = profile?.groupMemberships?.map((m) => m.groupId) ?? [];

  const { data: mixers = [] } = useQuery({
    queryKey: ['mixers', myGroupIds.join(','), myGroupIds.length],
    queryFn: async (): Promise<Mixer[]> => {
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
    enabled: !!profile,
    refetchInterval: 30 * 1000, // poll every 30s so auto-start/complete transitions reflect in UI
  });

  const { data: requests = [], data: requestsRawData = undefined } = useQuery({
    queryKey: ['mixer-requests', myGroupIds.join(','), myGroupIds.length],
    queryFn: async (): Promise<MixerRequest[]> => {
      if (myGroupIds.length === 0) return [];
      const results = await Promise.all(
        myGroupIds.map((gid) => api.mixerRequests.list(gid))
      );
      const seen = new Set<string>();
      return results.flat().filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    },
    enabled: !!profile,
  });

  const { data: multiGroupRequests } = useQuery({
    queryKey: ['multi-group-requests', myGroupIds.join(','), myGroupIds.length],
    queryFn: async (): Promise<MixerRequestsForGroup> => {
      if (myGroupIds.length === 0) return { inbound: [], outbound: [] };
      const results = await Promise.all(
        myGroupIds.map((gid) => api.mixerRequests.getForGroup(gid).then((res) => ({ gid, res })))
      );
      const seenInbound = new Set<string>();
      const seenOutbound = new Set<string>();
      const inbound: InboundMixerRequest[] = [];
      const outbound: OutboundMixerRequest[] = [];

      for (const { gid, res } of results) {
        for (const req of res.inbound) {
          if (!seenInbound.has(req.inviteId)) {
            seenInbound.add(req.inviteId);
            inbound.push({ ...req, receivingGroupId: gid });
          }
        }
        for (const req of res.outbound) {
          if (!seenOutbound.has(req.requestId)) {
            seenOutbound.add(req.requestId);
            outbound.push(req);
          }
        }
      }
      return { inbound, outbound };
    },
    enabled: !!profile && myGroupIds.length > 0,
  });

  const { data: availableRecaps = [] } = useQuery({
    queryKey: ['available-recaps', profile?.id],
    queryFn: () => api.recaps.getAvailable(profile!.id),
    enabled: !!profile?.id,
  });

  const liveMixers = (mixers as Mixer[]).filter(
    (m) =>
      m.status === 'live' &&
      m.participants?.some((p) => p.userId === profile?.id)
  );

  useEffect(() => {
    if (liveMixers.length === 0) return;
    const undismissed = liveMixers.find((m) => !activationDismissedIds.has(m.id));
    if (undismissed && !activationModalMixer) {
      api.mixers.get(undismissed.id).then((fullMixer) => {
        setActivationModalMixer(fullMixer);
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMixers.map((m) => m.id).join(',')]);

  const respondMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'accept' | 'decline' | 'counter';
    }) => api.mixerRequests.respond(id, { action, responderId: profile?.id ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mixers'] });
    },
  });

  const respondToInviteMutation = useMutation({
    mutationFn: ({
      inviteId,
      response,
    }: {
      inviteId: string;
      response: 'accepted' | 'declined';
    }) => api.mixerRequests.respondToInvite(inviteId, { responderId: profile?.id ?? '', response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mixers'] });
      Haptics.success();
    },
    onError: () => {
      Haptics.error();
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (id: string) => api.mixerRequests.cancel(id),
    onMutate: (id: string) => {
      // Optimistically remove from outbound lists immediately
      const prevRequests = queryClient.getQueryData<MixerRequest[]>(['mixer-requests', myGroupIds.join(','), myGroupIds.length]);
      const prevMulti = queryClient.getQueryData<{ inbound: OutboundMixerRequest[]; outbound: OutboundMixerRequest[] }>(['multi-group-requests', myGroupIds.join(','), myGroupIds.length]);
      queryClient.setQueryData<MixerRequest[]>(['mixer-requests', myGroupIds.join(','), myGroupIds.length], (old) =>
        old ? old.filter((r) => r.id !== id) : old
      );
      queryClient.setQueryData<{ inbound: OutboundMixerRequest[]; outbound: OutboundMixerRequest[] }>(['multi-group-requests', myGroupIds.join(','), myGroupIds.length], (old) =>
        old ? { ...old, outbound: old.outbound.filter((r) => r.requestId !== id) } : old
      );
      return { prevRequests, prevMulti };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevRequests) queryClient.setQueryData(['mixer-requests', myGroupIds.join(','), myGroupIds.length], ctx.prevRequests);
      if (ctx?.prevMulti) queryClient.setQueryData(['multi-group-requests', myGroupIds.join(','), myGroupIds.length], ctx.prevMulti);
      Haptics.error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] });
      Haptics.success();
    },
  });

  const dismissRequestMutation = useMutation({
    mutationFn: (id: string) => api.mixerRequests.dismiss(id),
    onMutate: (id: string) => {
      const prevRequests = queryClient.getQueryData<MixerRequest[]>(['mixer-requests', myGroupIds.join(','), myGroupIds.length]);
      const prevMulti = queryClient.getQueryData<{ inbound: OutboundMixerRequest[]; outbound: OutboundMixerRequest[] }>(['multi-group-requests', myGroupIds.join(','), myGroupIds.length]);
      queryClient.setQueryData<MixerRequest[]>(['mixer-requests', myGroupIds.join(','), myGroupIds.length], (old) =>
        old ? old.filter((r) => r.id !== id) : old
      );
      queryClient.setQueryData<{ inbound: OutboundMixerRequest[]; outbound: OutboundMixerRequest[] }>(['multi-group-requests', myGroupIds.join(','), myGroupIds.length], (old) =>
        old ? { ...old, outbound: old.outbound.filter((r) => r.requestId !== id) } : old
      );
      return { prevRequests, prevMulti };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevRequests) queryClient.setQueryData(['mixer-requests', myGroupIds.join(','), myGroupIds.length], ctx.prevRequests);
      if (ctx?.prevMulti) queryClient.setQueryData(['multi-group-requests', myGroupIds.join(','), myGroupIds.length], ctx.prevMulti);
      Haptics.error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['multi-group-requests'] });
    },
  });

  const handleOpenRatingModal = (mixer: Mixer, groupId: string) => {
    setRatingMixer(mixer);
    setRatingGroupId(groupId);
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!profile?.id || !ratingMixer || !ratingGroupId) return;
    setIsSubmittingRating(true);
    try {
      await api.ratings.submit({
        mixerId: ratingMixer.id,
        raterId: profile.id,
        ratedGroupId: ratingGroupId,
        rating,
        comment,
      });
      queryClient.invalidateQueries({ queryKey: ['mixers'] });
      queryClient.invalidateQueries({ queryKey: ['available-recaps'] });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleRecapPress = (recap: AvailableRecap) => {
    router.push(`/mixer/${recap.mixerId}`);
  };

  const handleActivationDismiss = () => {
    if (activationModalMixer) {
      setActivationDismissedIds((prev) => new Set([...prev, activationModalMixer.id]));
    }
    setActivationModalMixer(null);
  };

  const filterByQuery = (items: Mixer[]) => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((m) => {
      const groupAName = m.groupA?.name?.toLowerCase() ?? '';
      const groupBName = m.groupB?.name?.toLowerCase() ?? '';
      const location = m.location?.toLowerCase() ?? '';
      const activity = m.activity?.name?.toLowerCase() ?? '';
      return groupAName.includes(q) || groupBName.includes(q) || location.includes(q) || activity.includes(q);
    });
  };

  const filterByGroup = (items: Mixer[]) => {
    if (!selectedGroupId) return items;
    return items.filter((m) => m.groupA?.id === selectedGroupId || m.groupB?.id === selectedGroupId);
  };

  const activeMixers = filterByQuery(filterByGroup(
    (mixers as Mixer[]).filter((m) => {
      if (m.status === 'completed' || m.status === 'cancelled') return false;
      if (m.scheduledEnd && new Date(m.scheduledEnd) < new Date()) return false;
      // Stale live: no end time but started over 8 hours ago
      if (m.status === 'live' && !m.scheduledEnd && new Date(m.scheduledStart) < new Date(Date.now() - 8 * 60 * 60 * 1000)) return false;
      return true;
    })
  ));
  const liveActiveMixers = activeMixers.filter((m) => m.status === 'live');
  const upcomingMixers = activeMixers.filter((m) => m.status !== 'live');
  const completedMixers = filterByQuery(filterByGroup(
    (mixers as Mixer[]).filter((m) => {
      if (m.status === 'completed' || m.status === 'cancelled') return true;
      if (m.scheduledEnd && new Date(m.scheduledEnd) < new Date()) return true;
      // Stale live: no end time but started over 8 hours ago
      if (m.status === 'live' && !m.scheduledEnd && new Date(m.scheduledStart) < new Date(Date.now() - 8 * 60 * 60 * 1000)) return true;
      return false;
    })
  ));

  const incomingRequests = (requests as MixerRequest[]).filter((r) => {
    const groupMatch = !selectedGroupId || r.receivingGroupId === selectedGroupId;
    return myGroupIds.includes(r.receivingGroupId) && r.status === 'pending' && groupMatch;
  });
  const outgoingRequests = (requests as MixerRequest[]).filter((r) => {
    const groupMatch = !selectedGroupId || r.requestingGroupId === selectedGroupId;
    return myGroupIds.includes(r.requestingGroupId) && groupMatch;
  });

  const adminGroupIds = profile?.groupMemberships
    ?.filter((m) => m.role === 'admin' || m.role === 'social_chair')
    .map((m) => m.groupId) ?? [];

  const multiInboundPending = (multiGroupRequests?.inbound ?? []).filter((r) => {
    if (r.myStatus !== 'pending') return false;
    if (selectedGroupId && r.receivingGroupId !== selectedGroupId) return false;
    return true;
  });
  const multiInboundResponded = (multiGroupRequests?.inbound ?? []).filter((r) => {
    if (r.myStatus === 'pending') return false;
    if (selectedGroupId && r.receivingGroupId !== selectedGroupId) return false;
    return true;
  });
  const multiOutbound = (multiGroupRequests?.outbound ?? []).filter((r) => {
    if (!selectedGroupId) return true;
    return r.invitedGroups?.some((g) => g.groupId === selectedGroupId) ?? true;
  });
  const pendingCount = incomingRequests.length + multiInboundPending.length;
  // Only show skeleton on true first load (no cached data yet), not on refetches
  const isLoading = requestsRawData === undefined && multiGroupRequests === undefined;

  const hasNoGroups = myGroupIds.length === 0 && !!profile;

  // Groups list for selector
  const myGroups = (profile?.groupMemberships ?? []).map((m) => ({
    id: m.groupId,
    name: m.group?.name ?? 'Unknown',
    coverImageUrl: m.group?.coverImageUrl ?? null,
  }));
  const toStatusBadge = (status: MixerStatus): MixerStatusBadge => {
    if (status === 'cancelled') return 'completed';
    return status;
  };

  const handleRequestMixer = () => {
    Haptics.tap();
    if (myGroups.length === 0) return;
    router.push('/send-mixer-request');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <HeaderBackdrop height={260} variant="crimson" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.ink}
            progressViewOffset={38}
          />
        }
      >
        <View style={{ paddingHorizontal: DS.Spacing.lg }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: insets.top + DS.Spacing.sm }]}>
            <Text style={{ color: C.ink, fontSize: 38, fontFamily: F.bold, letterSpacing: -1.4 }}>Mixers</Text>
            <NotificationBell onPress={() => router.push('/notifications')} />
          </View>

          {/* ── Group Selector ──────────────────────────────────────────────── */}
          {myGroups.length > 0 && (
            <GroupSelectorDropdown
              groups={myGroups}
              selectedGroupId={selectedGroupId}
              onSelect={setSelectedGroupId}
            />
          )}

          {/* ── Stats Row ───────────────────────────────────────────────────── */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: C.surface,
            borderRadius: 14,
            marginBottom: DS.Spacing.lg,
            overflow: 'hidden',
          }}>
            <View style={styles.statCard}>
              <Text style={{ color: C.ink, fontSize: 22, fontFamily: F.bold, letterSpacing: -0.3 }}>{mixers.length}</Text>
              <Text style={{ color: C.ink3, fontSize: 11, fontFamily: F.medium, letterSpacing: 0.3, marginTop: 2 }}>Total Mixers</Text>
            </View>
            <View style={{ width: 1, backgroundColor: C.hairline, marginVertical: 10 }} />
            <View style={styles.statCard}>
              <Text style={{ color: C.ink, fontSize: 22, fontFamily: F.bold, letterSpacing: -0.3 }}>{activeMixers.length}</Text>
              <Text style={{ color: C.ink3, fontSize: 11, fontFamily: F.medium, letterSpacing: 0.3, marginTop: 2 }}>Upcoming</Text>
            </View>
          </View>

          {/* ── Segmented Control ───────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 4, marginBottom: DS.Spacing.lg }}>
            {SEGMENTS.map((label, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <Pressable
                  key={label}
                  onPress={() => { Haptics.tap(); setSelectedIndex(idx); }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderRadius: 9,
                    backgroundColor: isActive ? C.surface2 : 'transparent',
                  }}
                >
                  <Text style={{
                    color: isActive ? C.ink : C.ink3,
                    fontSize: 14,
                    fontFamily: isActive ? F.semibold : F.medium,
                    letterSpacing: -0.1,
                  }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Content ─────────────────────────────────────────────────────── */}
          {isLoading ? (
            <View style={{ gap: DS.Spacing.md }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : hasNoGroups ? (
            <NoGroupsOnboarding
              onBrowse={() => router.push('/(tabs)/groups')}
              onCreate={() => router.push('/create-group')}
            />
          ) : (
            <>
              {/* ── UPCOMING TAB ────────────────────────────────────────────── */}
              {selectedTab === 'active' && (
                <>
                  {availableRecaps.length > 0 && (
                    <View style={{ marginBottom: DS.Spacing.lg }}>
                      <SectionLabel
                        icon={<Zap size={13} color="#EC4899" />}
                        label={`Recaps Available (${availableRecaps.length})`}
                        color="#EC4899"
                      />
                      {availableRecaps.map((recap, index) => (
                        <AnimatedListItem key={recap.mixerId} index={index}>
                          <MixerRecapCard
                            recap={recap}
                            onPress={() => handleRecapPress(recap)}
                            canRate={
                              (myGroupIds.includes(recap.groupB.id) && !myGroupIds.includes(recap.groupA.id)) ||
                              (myGroupIds.includes(recap.groupA.id) && !myGroupIds.includes(recap.groupB.id))
                            }
                          />
                        </AnimatedListItem>
                      ))}
                    </View>
                  )}

                  {activeMixers.length === 0 && availableRecaps.length === 0 ? (
                    <EmptyState
                      customIcon={<VennDiagramIcon size={36} color={DS.Color.text3} />}
                      title="No upcoming mixers"
                      subtitle="Send a mixer request to get the party started!"
                    />
                  ) : (
                    <View style={{ gap: DS.Spacing.md }}>
                      {/* Live mixers first */}
                      {liveActiveMixers.length > 0 && (
                        <>
                          <SectionLabel
                            icon={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />}
                            label="Live Now"
                            color="#22C55E"
                          />
                          {liveActiveMixers.map((mixer, index) => (
                            <AnimatedListItem key={mixer.id} index={index}>
                              <Pressable
                                onPress={() => {
                                  Haptics.tap();
                                  router.push(`/mixer/${mixer.id}`);
                                }}
                              >
                                <MixerCard
                                  groupA={mixer.groupA?.name ?? 'Group A'}
                                  groupB={mixer.groupB?.name ?? 'Group B'}
                                  location={mixer.location}
                                  start={new Date(mixer.scheduledStart)}
                                  end={mixer.scheduledEnd ? new Date(mixer.scheduledEnd) : undefined}
                                  status={toStatusBadge(mixer.status)}
                                  activityName={mixer.activity?.name ?? 'TBD'}
                                />
                              </Pressable>
                            </AnimatedListItem>
                          ))}
                        </>
                      )}
                      {/* Upcoming mixers */}
                      {upcomingMixers.length > 0 && (
                        <>
                          {liveActiveMixers.length > 0 && (
                            <SectionLabel
                              icon={<Calendar size={13} color={DS.Color.text3} />}
                              label="Upcoming"
                              color={DS.Color.text3}
                            />
                          )}
                          {upcomingMixers.map((mixer, index) => (
                            <AnimatedListItem key={mixer.id} index={liveActiveMixers.length + index}>
                              <Pressable
                                onPress={() => {
                                  Haptics.tap();
                                  router.push(`/mixer/${mixer.id}`);
                                }}
                              >
                                <MixerCard
                                  groupA={mixer.groupA?.name ?? 'Group A'}
                                  groupB={mixer.groupB?.name ?? 'Group B'}
                                  location={mixer.location}
                                  start={new Date(mixer.scheduledStart)}
                                  end={mixer.scheduledEnd ? new Date(mixer.scheduledEnd) : undefined}
                                  status={toStatusBadge(mixer.status)}
                                  activityName={mixer.activity?.name ?? 'TBD'}
                                />
                              </Pressable>
                            </AnimatedListItem>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* ── REQUESTS TAB ──────────────────────────────────────────── */}
              {selectedTab === 'requests' && (
                <>
                  {/* Request Mixer CTA */}
                  {myGroups.length > 0 && (
                    <Pressable
                      onPress={handleRequestMixer}
                      style={({ pressed }) => [styles.requestMixerBtn, pressed && { opacity: 0.8 }]}
                    >
                      <LinearGradient
                        colors={['#3AE3A0', '#28C988']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.requestMixerBtnInner}
                      >
                        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.requestMixerBtnText}>Request Mixer</Text>
                      </LinearGradient>
                    </Pressable>
                  )}

                  {/* Multi-group incoming (new) */}
                  {multiInboundPending.length > 0 && (
                    <View style={{ marginBottom: DS.Spacing.lg }}>
                      <SectionLabel
                        icon={<Inbox size={13} color="#FF6B6B" />}
                        label={`Incoming (${multiInboundPending.length})`}
                        color="#FF6B6B"
                      />
                      <View style={{ gap: DS.Spacing.md }}>
                        {multiInboundPending.map((r, index) => (
                          <AnimatedListItem key={r.inviteId} index={index}>
                            <MultiGroupIncomingRequestCard
                              request={r}
                              groupName={myGroups.find((g) => g.id === r.receivingGroupId)?.name}
                              isPending={
                                respondToInviteMutation.isPending &&
                                respondToInviteMutation.variables?.inviteId === r.inviteId
                              }
                              canRespond={adminGroupIds.length > 0}
                              onAccept={() => respondToInviteMutation.mutate({ inviteId: r.inviteId, response: 'accepted' })}
                              onDecline={() => respondToInviteMutation.mutate({ inviteId: r.inviteId, response: 'declined' })}
                            />
                          </AnimatedListItem>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Legacy incoming */}
                  {incomingRequests.length > 0 && (
                    <View style={{ marginBottom: DS.Spacing.lg }}>
                      {multiInboundPending.length === 0 && (
                        <SectionLabel
                          icon={<Inbox size={13} color="#FF6B6B" />}
                          label={`Incoming (${incomingRequests.length})`}
                          color="#FF6B6B"
                        />
                      )}
                      <View style={{ gap: DS.Spacing.md }}>
                        {incomingRequests.map((r, index) => (
                          <AnimatedListItem key={r.id} index={index}>
                            <IncomingRequestCard
                              request={r}
                              isPending={
                                respondMutation.isPending &&
                                respondMutation.variables?.id === r.id
                              }
                              onAccept={() => respondMutation.mutate({ id: r.id, action: 'accept' })}
                              onCounter={() => respondMutation.mutate({ id: r.id, action: 'counter' })}
                              onDecline={() => respondMutation.mutate({ id: r.id, action: 'decline' })}
                            />
                          </AnimatedListItem>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Multi-group outgoing (new) */}
                  {multiOutbound.length > 0 && (
                    <View style={{ marginBottom: DS.Spacing.lg }}>
                      <SectionLabel
                        icon={<Send size={13} color={DS.Color.text3} />}
                        label={`Sent (${multiOutbound.length})`}
                        color={DS.Color.text2}
                      />
                      <View style={{ gap: DS.Spacing.md }}>
                        {multiOutbound.map((r, index) => (
                          <AnimatedListItem key={r.requestId} index={index}>
                            <MultiGroupSentRequestCard
                              request={r}
                              onCancel={() => cancelRequestMutation.mutate(r.requestId)}
                              isCancelling={cancelRequestMutation.isPending && cancelRequestMutation.variables === r.requestId}
                              onDismiss={() => dismissRequestMutation.mutate(r.requestId)}
                              isDismissing={dismissRequestMutation.isPending && dismissRequestMutation.variables === r.requestId}
                            />
                          </AnimatedListItem>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Legacy outgoing */}
                  {multiOutbound.length === 0 && outgoingRequests.length > 0 && (
                    <View>
                      <SectionLabel
                        icon={<Send size={13} color={DS.Color.text3} />}
                        label={`Sent (${outgoingRequests.length})`}
                        color={DS.Color.text2}
                      />
                      <View style={{ gap: DS.Spacing.md }}>
                        {outgoingRequests.map((r, index) => (
                          <AnimatedListItem key={r.id} index={index}>
                            <SentRequestCard
                              request={r}
                              onCancel={() => cancelRequestMutation.mutate(r.id)}
                              isCancelling={cancelRequestMutation.isPending && cancelRequestMutation.variables === r.id}
                              onDismiss={() => dismissRequestMutation.mutate(r.id)}
                              isDismissing={dismissRequestMutation.isPending && dismissRequestMutation.variables === r.id}
                            />
                          </AnimatedListItem>
                        ))}
                      </View>
                    </View>
                  )}

                  {incomingRequests.length === 0 && outgoingRequests.length === 0 && multiInboundPending.length === 0 && multiOutbound.length === 0 && (
                    <EmptyState
                      icon={Inbox}
                      title="No requests"
                      subtitle="You have no incoming or outgoing mixer requests right now"
                    />
                  )}
                </>
              )}

              {/* ── HISTORY TAB ───────────────────────────────────────────── */}
              {selectedTab === 'history' && (
                <>
                  {completedMixers.length > 0 && (
                    <View style={{ marginBottom: DS.Spacing.lg }}>
                      <SectionLabel
                        icon={<CheckCircle2 size={13} color={DS.Color.text3} />}
                        label={`History (${completedMixers.length})`}
                        color={DS.Color.text3}
                      />
                      <View style={{ gap: DS.Spacing.md }}>
                        {completedMixers.map((mixer, index) => (
                          <AnimatedListItem key={mixer.id} index={index}>
                            <HistoryMixerCard
                              mixer={mixer}
                              myGroupIds={myGroupIds}
                              onRate={(groupId) => handleOpenRatingModal(mixer, groupId)}
                            />
                          </AnimatedListItem>
                        ))}
                      </View>
                    </View>
                  )}

                  {completedMixers.length === 0 && (
                    <EmptyState
                      icon={CheckCircle2}
                      title="No history yet"
                      subtitle="Completed mixers will appear here"
                    />
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <MixerRatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setRatingMixer(null);
          setRatingGroupId(null);
        }}
        onSubmit={handleSubmitRating}
        groupName={
          ratingGroupId === ratingMixer?.groupA?.id
            ? ratingMixer?.groupA?.name ?? 'Group'
            : ratingMixer?.groupB?.name ?? 'Group'
        }
        isSubmitting={isSubmittingRating}
      />

      {/* Live Activation Modal */}
      {activationModalMixer && (
        <LiveActivationModal
          visible={!!activationModalMixer}
          mixer={activationModalMixer}
          profileId={profile?.id ?? ''}
          myProfile={profile ?? null}
          onDismiss={handleActivationDismiss}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupSelectorDropdown Styles
// ─────────────────────────────────────────────────────────────────────────────
const groupSelectorStyles = StyleSheet.create({
  container: {
    marginBottom: DS.Spacing.md,
    zIndex: 100,
  },
  trigger: {
    borderRadius: DS.Radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.30)',
  },
  triggerBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  triggerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  triggerAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: DS.Radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dropdownBlur: {
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    height: 52,
  },
  dropdownItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  dropdownAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    flex: 1,
    color: DS.Color.text2,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.Spacing.lg,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },

  // ── Stats Row ────────────────────────────────────────────────────────────────
  statsRowBorder: {
    borderRadius: DS.Radius.lg,
    padding: 1,
    marginBottom: DS.Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.Radius.lg - 1,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statNum: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statLabel: {
    color: DS.Color.text3,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  statDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Section Label ────────────────────────────────────────────────────────────
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: DS.Spacing.sm,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // ── Live Badge ────────────────────────────────────────────────────────────────
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(34,197,94,0.28)',
    position: 'relative',
  },
  liveGlow: {
    position: 'absolute',
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    color: '#22C55E',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // ── Request card shared ────────────────────────────────────────────────────
  fromToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fromToGroup: {
    flex: 1,
    gap: 2,
  },
  fromToGroupRight: {
    alignItems: 'flex-end',
  },
  fromToArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fromToLabel: {
    color: DS.Color.text3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fromToName: {
    color: DS.Color.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: DS.Color.text2,
    fontSize: 13,
    flex: 1,
  },
  detailTextSm: {
    color: DS.Color.text3,
    fontSize: 12,
    flex: 1,
  },
  messageBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: DS.Radius.sm,
    paddingHorizontal: DS.Spacing.md,
    paddingVertical: DS.Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  messageText: {
    color: DS.Color.text2,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  requestHeadline: {
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Action row (iOS-style confirmation strip) ────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    height: 48,
  },
  actionDecline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionDeclineText: {
    color: DS.Color.text3,
    fontWeight: '600',
    fontSize: 14,
  },
  actionDividerV: {
    width: 0.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  actionCounter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  actionCounterText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 14,
  },
  actionAccept: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  actionAcceptText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // ── Status banner ────────────────────────────────────────────────────────────
  statusBanner: {
    borderRadius: DS.Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBannerText: {
    fontWeight: '600',
    fontSize: 13,
  },

  // ── Card header / shared ─────────────────────────────────────────────────────
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: DS.Color.text,
    fontWeight: '700',
    fontSize: 14,
  },
  smallMuted: {
    color: DS.Color.text3,
    fontSize: 12,
  },
  cardGroupSubtitle: {
    color: DS.Color.text3,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusPillText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  inviteTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inviteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  inviteTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  inviteTagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Rating ────────────────────────────────────────────────────────────────────
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingChipText: {
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 12,
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: DS.Radius.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(245,158,11,0.07)',
  },
  rateButtonText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 12,
  },

  // ── No Groups / Onboarding ───────────────────────────────────────────────────
  onboardingWrap: {
    alignItems: 'center',
    paddingTop: DS.Spacing.xl,
  },
  onboardingIconWrap: {
    marginBottom: DS.Spacing.lg,
  },
  onboardingIconGrad: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 15,
    color: DS.Color.text2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: DS.Spacing.lg,
  },
  ctaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: DS.Spacing.xxl,
  },

  // ── Steps ────────────────────────────────────────────────────────────────────
  stepsSection: {
    width: '100%',
  },
  stepsSectionHeader: {
    marginBottom: DS.Spacing.lg,
  },
  stepsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 0,
    position: 'relative',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepBadgeNum: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepConnector: {
    position: 'absolute',
    left: 15.5,
    top: 32,
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 40,
    paddingHorizontal: DS.Spacing.md,
    paddingVertical: DS.Spacing.sm,
    borderRadius: DS.Radius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  stepSubtitle: {
    color: DS.Color.text3,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Request Mixer Button ─────────────────────────────────────────────────────
  requestMixerBtn: {
    borderRadius: DS.Radius.lg,
    overflow: 'hidden',
    marginBottom: DS.Spacing.lg,
  },
  requestMixerBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: DS.Radius.lg,
  },
  requestMixerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ── Android Group Picker Modal ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    color: DS.Color.text3,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.Color.stroke,
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: DS.Radius.md,
    backgroundColor: DS.Color.glass,
  },
  modalCancelText: {
    color: DS.Color.text2,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
