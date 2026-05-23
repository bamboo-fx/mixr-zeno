import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  Play,
  Zap,
  CheckCircle2,
  UserCheck,
  UserMinus,
  Trophy,
  Crown,
  MessageCircle,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated2, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';
import type { OpenMixerStatus, OpenMixerPairing } from '@/lib/types';

// ── Activity emoji map ────────────────────────────────────────────────────────
const ACTIVITY_EMOJI: Record<string, string> = {
  drinking_game: '🍻',
  icebreaker: '🎯',
  competition: '🏆',
  themed: '🎉',
  lowkey: '🌿',
  sports: '⚽',
  outdoor: '🏕️',
  social: '🎊',
};

const STATUS_COLORS: Record<OpenMixerStatus, string> = {
  open: '#22C55E',
  full: '#F59E0B',
  live: '#A855F7',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<OpenMixerStatus, string> = {
  open: 'Open',
  full: 'Full',
  live: 'Live Now',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ── Live pulse badge ──────────────────────────────────────────────────────────
function LivePulseBadge() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 100,
        backgroundColor: 'rgba(168,85,247,0.18)',
        borderWidth: DS.Stroke.hairline,
        borderColor: 'rgba(168,85,247,0.45)',
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#A855F7',
          opacity: pulseAnim,
        }}
      />
      <Text style={{ color: '#A855F7', fontWeight: '800', fontSize: 12, letterSpacing: 0.6 }}>
        LIVE NOW
      </Text>
    </View>
  );
}

// ── Avatar helper ─────────────────────────────────────────────────────────────
function Avatar({
  uri,
  name,
  size,
  borderColor,
}: {
  uri?: string;
  name: string;
  size: number;
  borderColor?: string;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderColor ? 2 : 0,
          borderColor: borderColor ?? 'transparent',
        }}
      />
    );
  }
  return (
    <LinearGradient
      colors={['#7C3AED', '#A855F7', '#D946EF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: borderColor ? 2 : 0,
        borderColor: borderColor ?? 'transparent',
      }}
    >
      <Text
        style={{ color: '#fff', fontSize: size * 0.33, fontWeight: '800' }}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

// ── Partner reveal modal ──────────────────────────────────────────────────────
function PartnerRevealModal({
  visible,
  partner,
  onClose,
}: {
  visible: boolean;
  partner: { name: string; avatarUrl?: string } | null;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: DS.Spacing.xl,
        }}
      >
        <Animated2.View
          entering={ZoomIn.springify()}
          style={{
            width: '100%',
            backgroundColor: DS.Color.bgSecondary,
            borderRadius: DS.Radius.xl,
            padding: DS.Spacing.xl,
            alignItems: 'center',
            borderWidth: DS.Stroke.hairline,
            borderColor: DS.Color.stroke,
          }}
        >
          {/* Top glow line */}
          <LinearGradient
            colors={['transparent', 'rgba(168,85,247,0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 32,
              right: 32,
              height: 1,
              borderRadius: 1,
            }}
          />

          <Animated2.Text entering={FadeIn.delay(200)} style={{ fontSize: 44, marginBottom: 16 }}>
            🎉
          </Animated2.Text>

          <Text
            style={{
              color: DS.Color.text3,
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 16,
            }}
          >
            You're paired with
          </Text>

          <Animated2.View entering={ZoomIn.delay(300).springify()} style={{ marginBottom: 14 }}>
            <Avatar uri={partner?.avatarUrl} name={partner?.name ?? '?'} size={88} borderColor={DS.Color.gelPurple} />
          </Animated2.View>

          <Animated2.Text
            entering={FadeInDown.delay(400).springify()}
            style={{
              color: DS.Color.text,
              fontSize: 24,
              fontWeight: '900',
              marginBottom: DS.Spacing.xl,
              textAlign: 'center',
            }}
          >
            {partner?.name ?? 'Someone awesome!'}
          </Animated2.Text>

          <Pressable
            onPress={onClose}
            style={{ width: '100%', borderRadius: DS.Radius.md, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                Let's Go! 🚀
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated2.View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OpenMixerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [revealModalVisible, setRevealModalVisible] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const { data: openMixer, isLoading } = useQuery({
    queryKey: ['open-mixer', id, profile?.id],
    queryFn: () => api.openMixers.get(id, profile?.id),
    enabled: !!id && !!profile?.id,
    refetchInterval: (query) =>
      query.state.data?.status === 'live' ? 8000 : false,
  });

  const isHost = openMixer?.hostId === profile?.id;
  const isParticipant = openMixer?.isParticipant ?? false;
  const participantCount =
    openMixer?._count?.participants ?? openMixer?.participants?.length ?? 0;
  const isFull = participantCount >= (openMixer?.maxCapacity ?? 20);
  const statusColor = STATUS_COLORS[(openMixer?.status ?? 'open') as OpenMixerStatus];

  // My pairing (when live)
  const myPairing = openMixer?.pairings?.find(
    (p) => p.userAId === profile?.id || p.userBId === profile?.id
  ) as OpenMixerPairing | undefined;
  const myPartner = myPairing
    ? myPairing.userAId === profile?.id
      ? myPairing.userB
      : myPairing.userA
    : null;

  // Detect live transition → show reveal modal
  useEffect(() => {
    if (!openMixer) return;
    if (prevStatusRef.current !== 'live' && openMixer.status === 'live') {
      if (isParticipant && myPairing) {
        setTimeout(() => setRevealModalVisible(true), 800);
      }
    }
    prevStatusRef.current = openMixer.status;
  }, [openMixer?.status, isParticipant, myPairing]);

  const joinMutation = useMutation({
    mutationFn: () => api.openMixers.join(id, profile!.id),
    onSuccess: async () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['open-mixer', id, profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['open-mixers'] });
      // Auto-create the chat room on join (fire and forget — room will be ready when they tap)
      if (profile?.id) {
        api.chat.getOpenMixerRoom(id, profile.id).catch(() => {});
      }
    },
    onError: () => Haptics.error(),
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.openMixers.leave(id, profile!.id),
    onSuccess: () => {
      Haptics.tap();
      queryClient.invalidateQueries({ queryKey: ['open-mixer', id, profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['open-mixers'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: OpenMixerStatus) =>
      api.openMixers.setStatus(id, status, profile!.id),
    onSuccess: (_, status) => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['open-mixer', id, profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['open-mixers'] });
      // Close the group chat when mixer ends
      if (status === 'completed' || status === 'cancelled') {
        api.chat.closeOpenMixerRoom(id).catch(() => {});
      }
    },
    onError: () => Haptics.error(),
  });

  const openChatRoom = async () => {
    if (!profile?.id) return;
    try {
      Haptics.tap();
      const room = await api.chat.getOpenMixerRoom(id, profile.id);
      router.push(`/chat-room?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}`);
    } catch {
      Haptics.error();
    }
  };

  const pairingsMutation = useMutation({
    mutationFn: () => api.openMixers.generatePairings(id, profile!.id),
    onSuccess: () => {
      Haptics.success();
      queryClient.invalidateQueries({ queryKey: ['open-mixer', id, profile?.id] });
    },
  });

  // Loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: DS.Color.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={DS.Color.gelPurple} />
      </View>
    );
  }

  if (!openMixer) {
    return (
      <GelBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: DS.Spacing.xl }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🌐</Text>
          <Text style={{ color: DS.Color.text3, fontSize: 16, marginBottom: 24 }}>Mixer not found</Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: DS.Color.panel,
              borderRadius: 100,
            }}
          >
            <Text style={{ color: DS.Color.text2, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </GelBackground>
    );
  }

  const activityEmoji =
    openMixer.activity
      ? (ACTIVITY_EMOJI[openMixer.activity.category] ?? '✨')
      : '🎊';

  const canJoin =
    !isParticipant &&
    !isHost &&
    openMixer.status === 'open' &&
    !isFull;
  const canLeave = isParticipant && !isHost && openMixer.status !== 'live' && openMixer.status !== 'completed';
  const isLive = openMixer.status === 'live';

  return (
    <GelBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        {openMixer.imageUrl ? (
          /* Cover image hero */
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: openMixer.imageUrl }}
              style={{ width: '100%', height: 240, resizeMode: 'cover' }}
            />
            {/* Dark gradient overlay for readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.55)', '#0A0A0A']}
              locations={[0, 0.6, 1]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
            />
            {/* Nav row on top of image */}
            <View
              style={{
                position: 'absolute',
                top: insets.top + DS.Spacing.sm,
                left: DS.Spacing.lg,
                right: DS.Spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: DS.Stroke.hairline,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <ArrowLeft size={18} color="#FFFFFF" />
              </Pressable>

              {isLive ? (
                <LivePulseBadge />
              ) : (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 100,
                    backgroundColor: `rgba(0,0,0,0.55)`,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: `${statusColor}55`,
                  }}
                >
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    {STATUS_LABELS[openMixer.status as OpenMixerStatus]}
                  </Text>
                </View>
              )}
            </View>

            {/* Title + capacity over the image bottom */}
            <View style={{ paddingHorizontal: DS.Spacing.lg, paddingBottom: DS.Spacing.lg, paddingTop: 4 }}>
              <Animated2.Text
                entering={FadeInDown.delay(100).springify()}
                style={{
                  color: DS.Color.text,
                  fontSize: 26,
                  fontWeight: '900',
                  letterSpacing: -0.5,
                  marginBottom: DS.Spacing.sm,
                }}
              >
                {openMixer.title}
              </Animated2.Text>

              <Animated2.View entering={FadeInDown.delay(200).springify()}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: DS.Color.text2, fontSize: 13, fontWeight: '600' }}>
                    {participantCount} / {openMixer.maxCapacity} joined
                  </Text>
                  <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
                    {Math.max(0, openMixer.maxCapacity - participantCount)} spots left
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <LinearGradient
                    colors={isFull ? ['#F59E0B', '#D97706'] : openMixer.color ? [openMixer.color, openMixer.color + 'CC'] : ['#A855F7', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${Math.min(100, (participantCount / openMixer.maxCapacity) * 100)}%` as any,
                    }}
                  />
                </View>
              </Animated2.View>
            </View>
          </View>
        ) : (
          /* Emoji hero fallback */
          <LinearGradient
            colors={['#0A0A0A', 'transparent']}
            style={{
              paddingTop: insets.top + DS.Spacing.sm,
              paddingHorizontal: DS.Spacing.lg,
              paddingBottom: DS.Spacing.xl,
            }}
          >
            {/* Nav row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: DS.Spacing.lg,
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: DS.Color.glassDark,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: DS.Stroke.hairline,
                  borderColor: DS.Color.stroke,
                }}
              >
                <ArrowLeft size={18} color={DS.Color.text2} />
              </Pressable>

              {isLive ? (
                <LivePulseBadge />
              ) : (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 100,
                    backgroundColor: `${statusColor}18`,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: `${statusColor}45`,
                  }}
                >
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    {STATUS_LABELS[openMixer.status as OpenMixerStatus]}
                  </Text>
                </View>
              )}
            </View>

            {/* Big emoji */}
            <Animated2.Text
              entering={ZoomIn.springify()}
              style={{ fontSize: 72, textAlign: 'center', marginBottom: DS.Spacing.md }}
            >
              {activityEmoji}
            </Animated2.Text>

            {/* Title */}
            <Animated2.Text
              entering={FadeInDown.delay(100).springify()}
              style={{
                color: DS.Color.text,
                fontSize: 26,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: -0.5,
                marginBottom: DS.Spacing.md,
              }}
            >
              {openMixer.title}
            </Animated2.Text>

            {/* Capacity bar */}
            <Animated2.View entering={FadeInDown.delay(200).springify()}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: DS.Color.text2, fontSize: 13, fontWeight: '600' }}>
                  {participantCount} / {openMixer.maxCapacity} joined
                </Text>
                <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
                  {Math.max(0, openMixer.maxCapacity - participantCount)} spots left
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={isFull ? ['#F59E0B', '#D97706'] : openMixer.color ? [openMixer.color, openMixer.color + 'CC'] : ['#A855F7', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 6,
                    borderRadius: 3,
                    width: `${Math.min(100, (participantCount / openMixer.maxCapacity) * 100)}%` as any,
                  }}
                />
              </View>
            </Animated2.View>
          </LinearGradient>
        )}

        <View style={{ paddingHorizontal: DS.Spacing.lg, gap: DS.Spacing.md }}>
          {/* ── Info card ──────────────────────────────────────────────── */}
          <Animated2.View entering={FadeInDown.delay(250).springify()}>
            <GelCard>
              <View style={{ gap: DS.Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={iconCircleStyle}>
                    <Calendar size={15} color={DS.Color.gelPurple} />
                  </View>
                  <Text style={{ color: DS.Color.text, fontWeight: '600', fontSize: 14 }}>
                    {format(new Date(openMixer.scheduledStart), "EEE, MMM d 'at' h:mm a")}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={iconCircleStyle}>
                    <MapPin size={15} color={DS.Color.gelPurple} />
                  </View>
                  <Text style={{ color: DS.Color.text, fontWeight: '600', fontSize: 14 }}>
                    {openMixer.location}
                  </Text>
                </View>
                {openMixer.activity && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={iconCircleStyle}>
                      <Sparkles size={15} color={DS.Color.gelPurple} />
                    </View>
                    <Text style={{ color: DS.Color.text, fontWeight: '600', fontSize: 14 }}>
                      {openMixer.activity.name}
                    </Text>
                  </View>
                )}
              </View>
            </GelCard>
          </Animated2.View>

          {/* ── Description ────────────────────────────────────────────── */}
          {openMixer.description && (
            <Animated2.View entering={FadeInDown.delay(300).springify()}>
              <GelCard>
                <Text style={sectionLabelStyle}>About</Text>
                <Text style={{ color: DS.Color.text2, fontSize: 14, lineHeight: 22 }}>
                  {openMixer.description}
                </Text>
              </GelCard>
            </Animated2.View>
          )}

          {/* ── Host card ──────────────────────────────────────────────── */}
          <Animated2.View entering={FadeInDown.delay(320).springify()}>
            <GelCard>
              <Text style={sectionLabelStyle}>Hosted by</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ position: 'relative' }}>
                  <Avatar
                    uri={openMixer.host?.avatarUrl}
                    name={openMixer.host?.name ?? '?'}
                    size={50}
                    borderColor={DS.Color.gelPurple}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: DS.Color.purple,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: DS.Color.bg,
                    }}
                  >
                    <Crown size={10} color="#fff" />
                  </View>
                </View>
                <View>
                  <Text style={{ color: DS.Color.text, fontWeight: '800', fontSize: 16 }}>
                    {openMixer.host?.name ?? 'Anonymous'}
                  </Text>
                  <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
                    Host · Open to all
                  </Text>
                </View>
              </View>
            </GelCard>
          </Animated2.View>

          {/* ── My Pairing (live only) ─────────────────────────────────── */}
          {isLive && isParticipant && myPartner && (
            <Animated2.View entering={ZoomIn.delay(200).springify()}>
              <GelCard>
                {/* Purple top accent */}
                <LinearGradient
                  colors={['rgba(168,85,247,0.5)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    borderTopLeftRadius: DS.Radius.md,
                    borderTopRightRadius: DS.Radius.md,
                  }}
                />
                <Text style={[sectionLabelStyle, { color: DS.Color.gelPurple }]}>
                  Your Partner
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Avatar
                    uri={myPartner.avatarUrl}
                    name={myPartner.name}
                    size={60}
                    borderColor={DS.Color.gelPurple}
                  />
                  <View>
                    <Text style={{ color: DS.Color.text, fontWeight: '800', fontSize: 18 }}>
                      {myPartner.name}
                    </Text>
                    <Text style={{ color: DS.Color.text3, fontSize: 12, marginTop: 2 }}>
                      Your mixer partner 🎉
                    </Text>
                    <Pressable
                      onPress={() => setRevealModalVisible(true)}
                      style={{ marginTop: 8 }}
                    >
                      <Text style={{ color: DS.Color.gelPurple, fontWeight: '700', fontSize: 13 }}>
                        See reveal again →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </GelCard>
            </Animated2.View>
          )}

          {/* ── Who's Coming ───────────────────────────────────────────── */}
          <Animated2.View entering={FadeInDown.delay(350).springify()}>
            <GelCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: DS.Spacing.md,
                }}
              >
                <Text style={sectionLabelStyle}>Who's Coming</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 100,
                    backgroundColor: DS.Color.panel,
                    borderWidth: DS.Stroke.hairline,
                    borderColor: DS.Color.stroke,
                  }}
                >
                  <Users size={11} color={DS.Color.gelPurple} />
                  <Text style={{ color: DS.Color.gelPurple, fontWeight: '700', fontSize: 12 }}>
                    {participantCount}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {(openMixer.participants ?? []).slice(0, 24).map((p) => (
                  <View key={p.id} style={{ alignItems: 'center', width: 52 }}>
                    <Avatar
                      uri={p.user?.avatarUrl}
                      name={p.user?.name ?? '?'}
                      size={44}
                    />
                    <Text
                      style={{
                        color: DS.Color.text3,
                        fontSize: 10,
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {p.user?.name?.split(' ')[0] ?? '?'}
                    </Text>
                  </View>
                ))}
                {participantCount > 24 && (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: DS.Color.panel,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: DS.Stroke.hairline,
                      borderColor: DS.Color.stroke,
                    }}
                  >
                    <Text style={{ color: DS.Color.text2, fontSize: 11, fontWeight: '700' }}>
                      +{participantCount - 24}
                    </Text>
                  </View>
                )}
                {participantCount === 0 && (
                  <Text style={{ color: DS.Color.text3, fontSize: 13, fontStyle: 'italic' }}>
                    Be the first to join!
                  </Text>
                )}
              </View>
            </GelCard>
          </Animated2.View>

          {/* ── Host Controls ──────────────────────────────────────────── */}
          {isHost &&
            openMixer.status !== 'completed' &&
            openMixer.status !== 'cancelled' && (
              <Animated2.View entering={FadeInDown.delay(400).springify()}>
                <GelCard>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: DS.Spacing.md,
                    }}
                  >
                    <Trophy size={15} color={DS.Color.warning} />
                    <Text style={[sectionLabelStyle, { color: DS.Color.warning }]}>
                      Host Controls
                    </Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    {/* Generate Pairings */}
                    {(openMixer.status === 'open' || openMixer.status === 'full') && (
                      <Pressable
                        onPress={() => {
                          Haptics.medium();
                          pairingsMutation.mutate();
                        }}
                        disabled={pairingsMutation.isPending || participantCount < 2}
                        style={{ borderRadius: DS.Radius.sm, overflow: 'hidden', opacity: participantCount < 2 ? 0.5 : 1 }}
                      >
                        <LinearGradient
                          colors={['#A855F7', '#7C3AED']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 14,
                            borderRadius: DS.Radius.sm,
                          }}
                        >
                          {pairingsMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Zap size={15} color="#fff" />
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                Generate Pairings
                              </Text>
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    )}

                    {/* Go Live */}
                    {(openMixer.status === 'open' || openMixer.status === 'full') && (
                      <Pressable
                        onPress={() => {
                          Haptics.heavy();
                          statusMutation.mutate('live');
                        }}
                        disabled={statusMutation.isPending}
                        style={{ borderRadius: DS.Radius.sm, overflow: 'hidden' }}
                      >
                        <LinearGradient
                          colors={['#A855F7', '#7C3AED', '#6D28D9']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 16,
                            borderRadius: DS.Radius.sm,
                            opacity: statusMutation.isPending ? 0.6 : 1,
                          }}
                        >
                          {statusMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Play size={16} color="#fff" fill="#fff" />
                              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                                Go Live
                              </Text>
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    )}

                    {/* Mark Complete */}
                    {openMixer.status === 'live' && (
                      <Pressable
                        onPress={() => {
                          Haptics.success();
                          statusMutation.mutate('completed');
                        }}
                        disabled={statusMutation.isPending}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          paddingVertical: 14,
                          borderRadius: DS.Radius.sm,
                          borderWidth: DS.Stroke.hairline,
                          borderColor: 'rgba(34,197,94,0.35)',
                          backgroundColor: 'rgba(34,197,94,0.1)',
                        }}
                      >
                        <CheckCircle2 size={15} color={DS.Color.success} />
                        <Text style={{ color: DS.Color.success, fontWeight: '700', fontSize: 14 }}>
                          Mark Complete
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </GelCard>
              </Animated2.View>
            )}
        </View>
      </ScrollView>

      {/* ── Sticky Join / Leave / Chat CTA ─────────────────────────── */}
      {(canJoin || canLeave || ((isParticipant || isHost) && openMixer.status !== 'cancelled')) && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + DS.Spacing.md,
            left: DS.Spacing.lg,
            right: DS.Spacing.lg,
          }}
        >
          {canJoin && (
            <Pressable
              onPress={() => {
                Haptics.medium();
                joinMutation.mutate();
              }}
              disabled={joinMutation.isPending}
              style={{ borderRadius: DS.Radius.md, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 18,
                }}
              >
                {joinMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <UserCheck size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>
                      Join Mixer
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

          {canLeave && (
            <Pressable
              onPress={() => {
                Haptics.tap();
                leaveMutation.mutate();
              }}
              disabled={leaveMutation.isPending}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                borderRadius: DS.Radius.md,
                borderWidth: DS.Stroke.hairline,
                borderColor: DS.Color.stroke,
                backgroundColor: DS.Color.glassDark,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {leaveMutation.isPending ? (
                <ActivityIndicator size="small" color={DS.Color.text2} />
              ) : (
                <>
                  <UserMinus size={16} color={DS.Color.text2} />
                  <Text style={{ color: DS.Color.text2, fontWeight: '600', fontSize: 14 }}>
                    Leave Mixer
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* Group Chat — visible to participants and host while mixer is not cancelled */}
          {(isParticipant || isHost) && openMixer.status !== 'cancelled' && (
            <Pressable
              onPress={openChatRoom}
              style={{
                marginTop: canJoin || canLeave ? 10 : 0,
                paddingVertical: 16,
                alignItems: 'center',
                borderRadius: DS.Radius.md,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 9,
                backgroundColor: openMixer.status === 'completed'
                  ? DS.Color.glassDark
                  : 'rgba(168,85,247,0.12)',
                borderWidth: 1,
                borderColor: openMixer.status === 'completed'
                  ? DS.Color.stroke
                  : 'rgba(168,85,247,0.40)',
              }}
            >
              <MessageCircle
                size={18}
                color={openMixer.status === 'completed' ? DS.Color.text3 : DS.Color.gelPurple}
              />
              <Text style={{
                color: openMixer.status === 'completed' ? DS.Color.text3 : DS.Color.gelPurple,
                fontWeight: '700',
                fontSize: 15,
              }}>
                {openMixer.status === 'completed' ? 'View Chat (Closed)' : 'Group Chat'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Partner Reveal Modal ─────────────────────────────────────── */}
      <PartnerRevealModal
        visible={revealModalVisible}
        partner={myPartner ?? null}
        onClose={() => setRevealModalVisible(false)}
      />
    </GelBackground>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const sectionLabelStyle = {
  color: DS.Color.text3,
  fontSize: 11,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.9,
  marginBottom: DS.Spacing.sm,
};

const iconCircleStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: DS.Color.panel,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: DS.Stroke.hairline,
  borderColor: DS.Color.stroke,
};

const styles = StyleSheet.create({});
