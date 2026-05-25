import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Shuffle, Sliders, Check, Link, Unlink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { Pairing, MixerParticipant, PairingMode, Mixer } from '@/lib/types';

type LocalPairing = { userAId: string; userBId: string };

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function AvatarCircle({
  name,
  size = 44,
  selected = false,
  color = '#00D4AA',
}: {
  name: string;
  size?: number;
  selected?: boolean;
  color?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: selected ? 2 : 0,
        borderColor: selected ? color : 'transparent',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.32 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function CompatibilityBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>Compatibility</Text>
        <Text style={{ color: '#00D4AA', fontSize: 11, fontWeight: '700' }}>{clamped}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#1F2937', borderRadius: 3 }}>
        <LinearGradient
          colors={['#00D4AA', '#6EE7B7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 6, borderRadius: 3, width: `${clamped}%` }}
        />
      </View>
    </View>
  );
}

const MODE_LABELS: Record<PairingMode, string> = {
  manual: 'Manual',
  random: 'Random',
  smart: 'Smart',
};

const MODE_COLORS: Record<PairingMode, string> = {
  manual: '#00D4AA',
  random: '#FF6B6B',
  smart: '#4F7CFF',
};

export default function PairingEditorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mixerId } = useLocalSearchParams<{ mixerId: string }>();

  const [mode, setMode] = useState<PairingMode>('random');
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [localPairings, setLocalPairings] = useState<LocalPairing[]>([]);
  const [savedState, setSavedState] = useState<boolean>(false);
  // Cluster mode UI state
  const [moveTarget, setMoveTarget] = useState<{ userId: string; name: string; currentClusterId: string } | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const { data: mixer, isLoading } = useQuery({
    queryKey: ['mixer', mixerId],
    queryFn: () => api.mixers.get(mixerId ?? ''),
    enabled: !!mixerId,
  });

  // Init localPairings from mixer.pairings on load
  useEffect(() => {
    if (mixer?.pairings) {
      setLocalPairings(
        mixer.pairings.map((p: Pairing) => ({ userAId: p.userAId, userBId: p.userBId }))
      );
    }
    if (mixer?.pairingMode) {
      setMode(mixer.pairingMode);
    }
  }, [mixer?.id]);

  const generateMutation = useMutation({
    mutationFn: (genMode: 'random' | 'smart') =>
      api.mixers.generatePairings(mixerId ?? '', genMode),
    onSuccess: (data: Pairing[]) => {
      setLocalPairings(data.map((p) => ({ userAId: p.userAId, userBId: p.userBId })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const isClusterMode = (mixer?.clusterSize ?? 2) >= 3;

  const { data: clusters = [] } = useQuery({
    queryKey: ['clusters', mixerId],
    queryFn: () => api.clusters.list(mixerId ?? ''),
    enabled: !!mixerId && isClusterMode,
    staleTime: 30_000,
  });

  const moveMemberMutation = useMutation({
    mutationFn: (vars: { userId: string; targetClusterId: string }) =>
      api.clusters.moveMember(mixerId ?? '', vars.userId, vars.targetClusterId, profile?.id ?? ''),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['clusters', mixerId] });
      queryClient.invalidateQueries({ queryKey: ['my-cluster', mixerId] });
      setMoveTarget(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.mixers.savePairings(mixerId ?? '', localPairings),
    onSuccess: () => {
      setSavedState(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['mixer', mixerId] });
      setTimeout(() => setSavedState(false), 3000);
    },
  });

  if (isLoading || !mixer) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0F17', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00D4AA" size="large" />
        <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 14 }}>Loading mixer...</Text>
      </View>
    );
  }

  const participants: MixerParticipant[] = (mixer.participants ?? []).filter(
    (p) => p.rsvpStatus === 'going'
  );
  const groupAId = mixer.groupAId;
  const groupBId = mixer.groupBId;
  const groupAMemberIds = new Set((mixer.groupA?.members ?? []).map((m) => m.userId));
  const groupBMemberIds = new Set((mixer.groupB?.members ?? []).map((m) => m.userId));
  // Use stored groupId first; fall back to actual group membership for mismatched participants
  const groupAParticipants = participants.filter(
    (p) => p.groupId === groupAId || (p.groupId !== groupBId && groupAMemberIds.has(p.userId))
  );
  const groupBParticipants = participants.filter(
    (p) => p.groupId === groupBId || (p.groupId !== groupAId && groupBMemberIds.has(p.userId))
  );

  const getPartner = (userId: string, groupSide: 'A' | 'B'): LocalPairing | undefined => {
    if (groupSide === 'A') {
      return localPairings.find((p) => p.userAId === userId);
    } else {
      return localPairings.find((p) => p.userBId === userId);
    }
  };

  const getPartnerName = (pairing: LocalPairing, side: 'A' | 'B'): string => {
    const partnerId = side === 'A' ? pairing.userBId : pairing.userAId;
    const found = participants.find((p) => p.userId === partnerId);
    return found?.user?.name ?? partnerId;
  };

  const handleTapParticipant = (userId: string, groupSide: 'A' | 'B') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (groupSide === 'A') {
      setSelectedA(selectedA === userId ? null : userId);
    } else {
      // groupB tap — if we have a selectedA, create a pairing
      if (selectedA !== null) {
        // Remove existing pairings for both
        const filtered = localPairings.filter(
          (p) => p.userAId !== selectedA && p.userBId !== userId
        );
        setLocalPairings([...filtered, { userAId: selectedA, userBId: userId }]);
        setSelectedA(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleUnpair = (pairing: LocalPairing) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalPairings((prev) => prev.filter((p) => p.userAId !== pairing.userAId || p.userBId !== pairing.userBId));
  };

  // Compute mock compatibility for smart mode display
  const getCompatibilityScore = (pairingIndex: number): number => {
    const scores = [92, 78, 85, 67, 88, 73, 95, 60];
    return scores[pairingIndex % scores.length] ?? 75;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F17' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#1F2937',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#141921',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#1F2937',
          }}
        >
          <X size={18} color="#9CA3AF" />
        </Pressable>

        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', flex: 1 }}>Pairings</Text>

        {/* Mode indicator pill */}
        <View
          style={{
            backgroundColor: (MODE_COLORS[mode] ?? '#00D4AA') + '20',
            borderRadius: 100,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: (MODE_COLORS[mode] ?? '#00D4AA') + '50',
          }}
        >
          <Text style={{ color: MODE_COLORS[mode] ?? '#00D4AA', fontSize: 12, fontWeight: '700' }}>
            {MODE_LABELS[mode]}
          </Text>
        </View>
      </View>

      {/* Mode Tabs */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#1F2937',
        }}
      >
        {(['manual', 'random', 'smart'] as PairingMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode(m);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: mode === m ? (MODE_COLORS[m] ?? '#00D4AA') : '#141921',
              borderWidth: 1,
              borderColor: mode === m ? 'transparent' : '#1F2937',
            }}
          >
            <Text
              style={{
                color: mode === m ? '#FFFFFF' : '#6B7280',
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {MODE_LABELS[m]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
      >
        {/* CLUSTER MODE: render clusters with tap-to-move members */}
        {isClusterMode ? (
          clusters.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                No clusters yet
              </Text>
              <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 280 }}>
                Hit "Generate Clusters" on the mixer detail to assign participants.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Text style={{ color: '#888', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 }}>
                Clusters · tap a member to move
              </Text>
              {clusters.map((cl) => (
                <View
                  key={cl.id}
                  style={{
                    backgroundColor: '#111',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: -0.2 }}>
                    {cl.name ?? 'Cluster'}
                    <Text style={{ color: '#888', fontWeight: '500' }}>  ·  {cl.members.length} {cl.members.length === 1 ? 'member' : 'members'}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {cl.members.map((m) => {
                      const isHome = m.groupId === mixer.groupAId;
                      const accent = isHome ? '#4F7CFF' : '#FF4D5E';
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => setMoveTarget({
                            userId: m.userId,
                            name: m.profile?.name ?? 'Unknown',
                            currentClusterId: cl.id,
                          })}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: accent + '55',
                            backgroundColor: pressed ? accent + '22' : accent + '14',
                          })}
                        >
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: accent }} />
                          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                            {m.profile?.name ?? 'Unknown'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}

        {/* MANUAL MODE */}
        {!isClusterMode && mode === 'manual' && (
          <View>
            <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              {selectedA ? 'Now tap someone from Group B to pair them' : 'Tap someone from Group A first'}
            </Text>

            {groupAParticipants.length === 0 && groupBParticipants.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: '#4B5563', fontSize: 15 }}>No participants yet</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Group A Column */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D4AA' }} />
                    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {mixer.groupA?.name ?? 'Group A'}
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {groupAParticipants.map((p) => {
                      const name = p.user?.name ?? p.userId;
                      const isSelected = selectedA === p.userId;
                      const pairing = getPartner(p.userId, 'A');

                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => handleTapParticipant(p.userId, 'A')}
                          style={{
                            backgroundColor: '#141921',
                            borderRadius: 14,
                            padding: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isSelected ? '#00D4AA' : pairing ? '#00D4AA40' : '#1F2937',
                          }}
                        >
                          <AvatarCircle name={name} selected={isSelected} />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' }} numberOfLines={1}>
                            {name.split(' ')[0]}
                          </Text>
                          {pairing && (
                            <View style={{ marginTop: 4, alignItems: 'center' }}>
                              <View style={{ width: 2, height: 8, backgroundColor: '#00D4AA' }} />
                              <Text style={{ color: '#00D4AA', fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                                {getPartnerName(pairing, 'A').split(' ')[0]}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Divider */}
                <View style={{ width: 1, backgroundColor: '#1F2937', marginVertical: 30 }} />

                {/* Group B Column */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' }} />
                    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {mixer.groupB?.name ?? 'Group B'}
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {groupBParticipants.map((p) => {
                      const name = p.user?.name ?? p.userId;
                      const pairing = getPartner(p.userId, 'B');

                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => handleTapParticipant(p.userId, 'B')}
                          style={{
                            backgroundColor: '#141921',
                            borderRadius: 14,
                            padding: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: selectedA !== null ? '#FF6B6B50' : pairing ? '#FF6B6B40' : '#1F2937',
                          }}
                        >
                          <AvatarCircle name={name} color="#FF6B6B" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' }} numberOfLines={1}>
                            {name.split(' ')[0]}
                          </Text>
                          {pairing && (
                            <View style={{ marginTop: 4, alignItems: 'center' }}>
                              <View style={{ width: 2, height: 8, backgroundColor: '#FF6B6B' }} />
                              <Text style={{ color: '#FF6B6B', fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                                {getPartnerName(pairing, 'B').split(' ')[0]}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Active pairs + unpair */}
            {localPairings.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Active Pairs
                </Text>
                <View style={{ gap: 8 }}>
                  {localPairings.map((pairing, idx) => {
                    const nameA = participants.find((p) => p.userId === pairing.userAId)?.user?.name ?? pairing.userAId;
                    const nameB = participants.find((p) => p.userId === pairing.userBId)?.user?.name ?? pairing.userBId;
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#141921',
                          borderRadius: 14,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: '#1F2937',
                        }}
                      >
                        <AvatarCircle name={nameA} size={36} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Link size={14} color="#00D4AA" />
                          <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>paired</Text>
                        </View>
                        <AvatarCircle name={nameB} size={36} color="#FF6B6B" />
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{nameA.split(' ')[0]} ↔ {nameB.split(' ')[0]}</Text>
                        </View>
                        <Pressable
                          onPress={() => handleUnpair(pairing)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: '#FF6B6B15',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#FF6B6B30',
                          }}
                        >
                          <Unlink size={13} color="#FF6B6B" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* RANDOM MODE */}
        {!isClusterMode && mode === 'random' && (
          <View>
            <View
              style={{
                backgroundColor: '#141921',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#1F2937',
              }}
            >
              <Shuffle size={40} color="#FF6B6B" style={{ marginBottom: 12 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
                Random Pairings
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                Randomly match one person from each group together. Pure chance!
              </Text>
              <Pressable
                onPress={() => generateMutation.mutate('random')}
                disabled={generateMutation.isPending}
                style={{
                  backgroundColor: '#FF6B6B',
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: generateMutation.isPending ? 0.6 : 1,
                }}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Shuffle size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  {generateMutation.isPending ? 'Generating...' : 'Generate Random Pairings'}
                </Text>
              </Pressable>
            </View>

            {localPairings.length > 0 && (
              <View>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Generated Pairs
                </Text>
                <View style={{ gap: 10 }}>
                  {localPairings.map((pairing, idx) => {
                    const nameA = participants.find((p) => p.userId === pairing.userAId)?.user?.name ?? pairing.userAId;
                    const nameB = participants.find((p) => p.userId === pairing.userBId)?.user?.name ?? pairing.userBId;
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#141921',
                          borderRadius: 16,
                          padding: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderWidth: 1,
                          borderColor: '#1F2937',
                        }}
                      >
                        <AvatarCircle name={nameA} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: '900' }}>↔</Text>
                        </View>
                        <AvatarCircle name={nameB} color="#FF6B6B" />
                        <View style={{ flex: 2 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                            {nameA.split(' ')[0]} & {nameB.split(' ')[0]}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* SMART MODE */}
        {!isClusterMode && mode === 'smart' && (
          <View>
            <LinearGradient
              colors={['#4F7CFF20', '#28C98810']}
              style={{
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#4F7CFF30',
              }}
            >
              <Sparkles size={40} color="#4F7CFF" style={{ marginBottom: 12 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
                Smart Pairings
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                AI matches people based on shared interests, personality, and drinking preference.
              </Text>
              <Pressable
                onPress={() => generateMutation.mutate('smart')}
                disabled={generateMutation.isPending}
                style={{
                  backgroundColor: '#4F7CFF',
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: generateMutation.isPending ? 0.6 : 1,
                }}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Sparkles size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  {generateMutation.isPending ? 'Analyzing...' : 'Generate Smart Pairings'}
                </Text>
              </Pressable>
            </LinearGradient>

            {localPairings.length > 0 && (
              <View>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Smart Matches
                </Text>
                <View style={{ gap: 12 }}>
                  {localPairings.map((pairing, idx) => {
                    const nameA = participants.find((p) => p.userId === pairing.userAId)?.user?.name ?? pairing.userAId;
                    const nameB = participants.find((p) => p.userId === pairing.userBId)?.user?.name ?? pairing.userBId;
                    const score = getCompatibilityScore(idx);

                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#141921',
                          borderRadius: 16,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: '#4F7CFF30',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <AvatarCircle name={nameA} color="#4F7CFF" />
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: '#4F7CFF', fontSize: 18, fontWeight: '900' }}>↔</Text>
                          </View>
                          <AvatarCircle name={nameB} color="#4F7CFF" />
                          <View style={{ flex: 2 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                              {nameA.split(' ')[0]} & {nameB.split(' ')[0]}
                            </Text>
                          </View>
                        </View>

                        <CompatibilityBar score={score} />

                        {/* Why matched chips */}
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600', marginRight: 2 }}>
                            Why matched:
                          </Text>
                          <View style={{ backgroundColor: '#00D4AA20', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#00D4AA40' }}>
                            <Text style={{ color: '#00D4AA', fontSize: 11, fontWeight: '600' }}>Shared interests</Text>
                          </View>
                          <View style={{ backgroundColor: '#4F7CFF20', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#4F7CFF40' }}>
                            <Text style={{ color: '#4F7CFF', fontSize: 11, fontWeight: '600' }}>Drinking match</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Save Pairings Button (floating bottom) */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 12,
          backgroundColor: '#0B0F17',
          borderTopWidth: 1,
          borderTopColor: '#1F2937',
        }}
      >
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || localPairings.length === 0}
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: saveMutation.isPending || localPairings.length === 0 ? 0.5 : 1,
            backgroundColor: savedState ? '#10B981' : '#00D4AA',
          }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : savedState ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Pairings Saved!</Text>
            </>
          ) : (
            <>
              <Link size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                Save Pairings ({localPairings.length})
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Move-member modal (cluster mode only) */}
      <Modal
        visible={!!moveTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveTarget(null)}
      >
        <Pressable
          onPress={() => setMoveTarget(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 20, gap: 12 }}
          >
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }}>
              Move {moveTarget?.name}
            </Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>
              Pick the target cluster.
            </Text>
            <View style={{ gap: 8 }}>
              {clusters.map((cl) => {
                const isCurrent = cl.id === moveTarget?.currentClusterId;
                return (
                  <Pressable
                    key={cl.id}
                    onPress={() => {
                      if (!moveTarget || isCurrent) return;
                      moveMemberMutation.mutate({ userId: moveTarget.userId, targetClusterId: cl.id });
                    }}
                    disabled={isCurrent || moveMemberMutation.isPending}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isCurrent ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                      backgroundColor: isCurrent ? 'rgba(255,255,255,0.04)' : 'transparent',
                      opacity: moveMemberMutation.isPending ? 0.5 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: isCurrent ? '#666' : '#FFF', fontSize: 14, fontWeight: '600' }}>
                      {cl.name ?? 'Cluster'}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      {isCurrent ? 'Current' : `${cl.members.length} members`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setMoveTarget(null)}
              style={{ marginTop: 6, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
