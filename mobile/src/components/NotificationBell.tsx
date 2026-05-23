import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// Venn diagram icon — two interlocked circles
function NotificationIcon({ hasUnread }: { hasUnread: boolean }) {
  const color = hasUnread ? '#FFFFFF' : 'rgba(255,255,255,0.75)';
  return (
    <Svg width={20} height={14} viewBox="0 0 20 14">
      {/* Left circle */}
      <Circle cx={7} cy={7} r={6} fill="none" stroke={color} strokeWidth={1.6} />
      {/* Right circle — shifted right to overlap */}
      <Circle cx={13} cy={7} r={6} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

interface NotificationBellProps {
  onPress?: () => void;
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const profileId = useAuthStore((s) => s.profile?.id);
  const scale = useSharedValue(1);

  const { data } = useQuery({
    queryKey: ['unread-count', profileId],
    queryFn: () => api.notifications.getUnreadCount(profileId!),
    enabled: !!profileId,
    refetchInterval: 30000,
  });

  const unreadCount = data ?? 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      hitSlop={12}
    >
      <Animated.View style={[styles.wrapper, animStyle]}>
        <NotificationIcon hasUnread={unreadCount > 0} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
});
