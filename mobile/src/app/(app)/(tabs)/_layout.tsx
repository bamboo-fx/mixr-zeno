import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, TouchableOpacity } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, Users, User, Camera, Globe, UserPlus } from 'lucide-react-native';
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

  const iconColor = focused ? '#FFFFFF' : 'rgba(255,255,255,0.4)';

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
  { label: 'Add Story',           icon: Camera,   route: '/post-global-story', color: '#A855F7' },
  { label: 'Add Open Mixer',      icon: Globe,    route: '/create-open-mixer', color: '#5BC4EF' },
  { label: 'Create Group',        icon: Users,    route: '/create-group',      color: '#C472C8' },
  { label: 'Send Mixr Request',   icon: UserPlus, route: '/send-mixer-request',color: '#9B70D6' },
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
          <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.menuOverlay]} />
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
                  pressed && { backgroundColor: 'rgba(168,85,247,0.08)' },
                ]}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}>
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
          <Image source={NAV_PLUS_BUTTON} style={styles.plusButtonImage} resizeMode="contain" />
        </Animated.View>
      </Pressable>
    </>
  );
}

function CustomTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {/* Dark blur base */}
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Blue-purple gradient overlay */}
      <LinearGradient
        colors={['rgba(91,122,220,0.28)', 'rgba(155,112,214,0.22)', 'rgba(196,114,200,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle dark tint to deepen */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,5,20,0.45)' }]} />
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
  },
  lightOverlay: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  topBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(155,112,214,0.5)',
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -5, right: -6,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
  plusButtonImage: {
    width: 64,
    height: 64,
  },
  // Popup menu
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuSheet: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  menuOverlay: {
    backgroundColor: 'rgba(255,255,255,0.6)',
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
    borderBottomColor: 'rgba(0,0,0,0.08)',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
