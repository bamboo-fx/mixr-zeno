import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Plus,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  Globe,
} from 'lucide-react-native';
import { format, isWeekend, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { GelBackground, GelCard } from '@/components/gel';
import type { OpenMixer } from '@/lib/types';

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

type FilterType = 'all' | 'weekend' | 'next-week';

function OpenMixerCard({
  mixer,
  myId,
  onPress,
}: {
  mixer: OpenMixer;
  myId?: string;
  onPress: () => void;
}) {
  const count = mixer._count?.participants ?? mixer.participants?.length ?? 0;
  const isFull = count >= mixer.maxCapacity;
  const isJoined = mixer.isParticipant || mixer.hostId === myId;
  const isLive = mixer.status === 'live';
  const emoji = mixer.activity ? (ACTIVITY_EMOJI[mixer.activity.category] ?? '✨') : '🎊';

  return (
    <Pressable onPress={onPress}>
      <GelCard style={{ marginBottom: DS.Spacing.md }}>
        <View style={{ flexDirection: 'row', gap: DS.Spacing.md, alignItems: 'flex-start' }}>
          {/* Emoji square */}
          <LinearGradient
            colors={
              isLive
                ? ['rgba(168,85,247,0.35)', 'rgba(124,58,237,0.2)']
                : ['rgba(168,85,247,0.2)', 'rgba(124,58,237,0.1)']
            }
            style={{
              width: 62,
              height: 62,
              borderRadius: DS.Radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: DS.Stroke.hairline,
              borderColor: isLive ? DS.Color.gelPurple : DS.Color.stroke,
            }}
          >
            <Text style={{ fontSize: 30 }}>{emoji}</Text>
            {isLive && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#A855F7',
                }}
              />
            )}
          </LinearGradient>

          {/* Info */}
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{ color: DS.Color.text, fontWeight: '800', fontSize: 15 }}
              numberOfLines={1}
            >
              {mixer.title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} color={DS.Color.text3} />
              <Text style={{ color: DS.Color.text3, fontSize: 12 }}>
                {format(new Date(mixer.scheduledStart), "EEE, MMM d 'at' h:mm a")}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} color={DS.Color.text3} />
              <Text style={{ color: DS.Color.text3, fontSize: 12 }} numberOfLines={1}>
                {mixer.location}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              {/* Participant pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 100,
                  backgroundColor: isFull
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(34,197,94,0.08)',
                  borderWidth: 0.5,
                  borderColor: isFull
                    ? 'rgba(245,158,11,0.35)'
                    : 'rgba(34,197,94,0.25)',
                }}
              >
                <Users size={10} color={isFull ? DS.Color.warning : DS.Color.success} />
                <Text
                  style={{
                    color: isFull ? DS.Color.warning : DS.Color.success,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {count}/{mixer.maxCapacity}
                  {isFull ? ' · Full' : ''}
                </Text>
              </View>

              {/* Host + join status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {mixer.host?.avatarUrl ? (
                  <Image
                    source={{ uri: mixer.host.avatarUrl }}
                    style={{ width: 20, height: 20, borderRadius: 10 }}
                  />
                ) : null}
                {isJoined && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 100,
                      backgroundColor: 'rgba(34,197,94,0.15)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(34,197,94,0.4)',
                    }}
                  >
                    <Text style={{ color: DS.Color.success, fontSize: 10, fontWeight: '800' }}>
                      Joined
                    </Text>
                  </View>
                )}
                <ChevronRight size={14} color={DS.Color.text3} />
              </View>
            </View>
          </View>
        </View>
      </GelCard>
    </Pressable>
  );
}

export default function OpenMixersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: openMixers = [], isLoading } = useQuery({
    queryKey: ['open-mixers', profile?.id],
    queryFn: () => api.openMixers.list({ limit: 50, userId: profile?.id }),
  });

  const filteredMixers = (openMixers as OpenMixer[]).filter((m) => {
    // Hide mixers whose end time has already passed
    if (m.scheduledEnd && new Date(m.scheduledEnd) < new Date()) return false;
    if (m.status === 'completed' || m.status === 'cancelled') return false;
    const date = new Date(m.scheduledStart);
    const now = new Date();
    if (filter === 'weekend') {
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      return isWeekend(date) && isWithinInterval(date, { start: weekStart, end: weekEnd });
    }
    if (filter === 'next-week') {
      const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
      const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
      return isWithinInterval(date, { start: nextWeekStart, end: nextWeekEnd });
    }
    return true;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['open-mixers'] });
    setRefreshing(false);
  }, [queryClient]);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Upcoming' },
    { key: 'weekend', label: 'This Weekend' },
    { key: 'next-week', label: 'Next Week' },
  ];

  return (
    <GelBackground>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + DS.Spacing.md,
            paddingHorizontal: DS.Spacing.lg,
            paddingBottom: DS.Spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: DS.Spacing.md,
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color={DS.Color.gelPurple} />
              <Text style={{ color: DS.Color.text, fontSize: 18, fontWeight: '800' }}>
                Open Mixers
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.tap();
                router.push('/create-open-mixer');
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                style={{
                  width: 38,
                  height: 38,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.tap();
                  setFilter(f.key);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 100,
                  backgroundColor:
                    filter === f.key ? 'rgba(168,85,247,0.22)' : DS.Color.panel,
                  borderWidth: DS.Stroke.hairline,
                  borderColor:
                    filter === f.key ? DS.Color.gelPurple : DS.Color.stroke,
                }}
              >
                <Text
                  style={{
                    color: filter === f.key ? DS.Color.gelPurple : DS.Color.text2,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: DS.Spacing.lg,
            paddingBottom: 100,
            paddingTop: DS.Spacing.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={DS.Color.gelPurple}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator
              color={DS.Color.gelPurple}
              style={{ marginTop: 60 }}
            />
          ) : filteredMixers.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 70 }}>
              <Text style={{ fontSize: 52, marginBottom: DS.Spacing.md }}>🌐</Text>
              <Text
                style={{
                  color: DS.Color.text,
                  fontWeight: '800',
                  fontSize: 20,
                  marginBottom: 8,
                }}
              >
                No mixers yet
              </Text>
              <Text
                style={{
                  color: DS.Color.text2,
                  fontSize: 14,
                  textAlign: 'center',
                  marginBottom: DS.Spacing.xl,
                  lineHeight: 20,
                  paddingHorizontal: DS.Spacing.xl,
                }}
              >
                Be the first to post a public mixer anyone can join — no group needed.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.medium();
                  router.push('/create-open-mixer');
                }}
                style={{ borderRadius: DS.Radius.md, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={['#A855F7', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: 28,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    Post a Mixer
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            filteredMixers.map((mixer) => (
              <OpenMixerCard
                key={mixer.id}
                mixer={mixer}
                myId={profile?.id}
                onPress={() => {
                  Haptics.tap();
                  router.push(`/open-mixer/${mixer.id}`);
                }}
              />
            ))
          )}
        </ScrollView>
      </View>
    </GelBackground>
  );
}
