import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, TouchableOpacity } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Users, User, Camera, Globe, UserPlus, Plus } from 'lucide-react-native';
import { colors as C, fonts as F } from '@/lib/theme';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { useAuthStore } from '@/lib/state/auth-store';
import { api } from '@/lib/api';
import { Haptics } from '@/lib/haptics';

const NAV_PLUS_BUTTON = require('../../../../assets/images/nav-plus-button.png');

function VennIcon({ size, color }: { size: number; color: string; strokeWidth?: number }) {
  const r = size * 0.28;
  const cy = size / 2;
  const offset = r * 0.38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2 - offset} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx={size / 2 + offset} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

const ICON_SIZE = 22;

const LEFT_ROUTES = [
  { name: 'index',  href: '/',       label: 'Discover', Icon: Compass },
  { name: 'groups', href: '/groups', label: 'Groups',   Icon: Users   },
] as const;

const RIGHT_ROUTES = [
  { name: 'mixers',  href: '/mixers',  label: 'Mixers',  Icon: VennIcon },
  { name: 'profile', href: '/profile', label: 'Profile', Icon: User     },
] as const;

function usePendingMixerRequestsCount(): number {
  const profileId = useAuthStore((s) => s.profile?.id);
  const groupMemberships = useAuthStore((s) => s.profile?.groupMemberships);
  const groupIds = React.useMemo(
    () => groupMemberships?.map((m) => m.groupId) ?? [],
    [groupMemberships]
  );
  const { data } = useQuery({
    queryKey: ['mixer-requests-badge', profileId, groupIds],
    queryFn: async () => {
      if (!profileId || groupIds.length === 0) return 0;
      const results = await Promise.all(
        groupIds.map((gid) => api.mixerRequests.list(gid).catch(() => [] as import('@/lib/types').MixerRequest[]))
      );
      const allRequests = results.flat();
      return allRequests.filter(
        (r) => r.status === 'pending' && groupIds.includes(r.receivingGroupId)
      ).length;
    },
    enabled: !!profileId && groupIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}

function MixerBadge() {
  const count = usePendingMixerRequestsCount();
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function TabButton({
  routeName, href, label, Icon,
}: {
  routeName: string; href: string; label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}) {
  const segments = useSegments();
  const router = useRouter();
  const lastSegment = segments[segments.length - 1];
  const focused =
    routeName === 'index'
      ? lastSegment === '(tabs)' || lastSegment === 'index' || (segments.length as number) === 2
      : lastSegment === routeName;

  const scale = useSharedValue(1);
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = focused ? C.ink : C.ink3;

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.92, { damping: 15, stiffness: 500 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 500 }); }}
      onPress={() => router.navigate(href as Parameters<typeof router.navigate>[0])}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabButtonInner, containerStyle]}>
        <View style={styles.iconWrapper}>
          <Icon size={ICON_SIZE} color={iconColor} strokeWidth={focused ? 2.2 : 1.8} />
          {routeName === 'mixers' && <MixerBadge />}
        </View>
        <Text style={[styles.label, { color: iconColor }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const MENU_ITEMS = [
  { label: 'Add Story',           icon: Camera,   route: '/post-global-story', color: C.amber   },
  { label: 'Add Open Mixer',      icon: Globe,    route: '/create-open-mixer', color: C.navy    },
  { label: 'Create Group',        icon: Users,    route: '/create-group',      color: C.crimson },
  { label: 'Send Mixr Request',   icon: UserPlus, route: '/send-mixer-request',color: C.ink     },
] as const;

function PlusButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <>
      {/* Popup modal */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        {/* Backdrop */}
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
        </Animated.View>

        {/* Menu sheet */}
        <Animated.View entering={SlideInDown.springify().damping(18).stiffness(200)} style={styles.menuSheet}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  Haptics.tap();
                  setOpen(false);
                  setTimeout(() => router.push(item.route as any), 200);
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  i < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                  pressed && { backgroundColor: C.surface3 },
                ]}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.color + '22', borderColor: item.color + '55' }]}>
                  <Icon size={18} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </Modal>

      {/* The button itself */}
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 15, stiffness: 500 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 500 }); }}
        onPress={() => { Haptics.tap(); setOpen(true); }}
        style={styles.plusButtonWrapper}
      >
        <Animated.View style={buttonStyle}>
          <View style={styles.plusButtonInner}>
            <Plus size={28} color={C.bg} strokeWidth={2.6} />
          </View>
        </Animated.View>
      </Pressable>
    </>
  );
}

function CustomTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      <View style={styles.topBorder} />
      <View style={[styles.tabRow, { height: 50, paddingTop: 12 }]}>
        {LEFT_ROUTES.map((r) => (
          <TabButton key={r.name} routeName={r.name} href={r.href} label={r.label} Icon={r.Icon} />
        ))}

        {/* Center plus button */}
        <View style={styles.plusSlot}>
          <PlusButton />
        </View>

        {RIGHT_ROUTES.map((r) => (
          <TabButton key={r.name} routeName={r.name} href={r.href} label={r.label} Icon={r.Icon} />
        ))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Discover' }} />
      <Tabs.Screen name="groups"  options={{ title: 'Groups' }} />
      <Tabs.Screen name="map"     options={{ title: 'Map', href: null }} />
      <Tabs.Screen name="mixers"  options={{ title: 'Mixers' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg,
  },
  topBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrapper: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: F.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -5, right: -6,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: C.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  badgeText: {
    fontFamily: F.bold,
    color: C.ink,
    fontSize: 10,
    lineHeight: 12,
  },
  // Plus button slot — center of tab bar, raised up
  plusSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonWrapper: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
  },
  plusButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  // Popup menu
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  menuSheet: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
    backgroundColor: C.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuLabel: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: C.ink,
  },
});
