import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LucideIcon } from 'lucide-react-native';
import { Haptics } from '@/lib/haptics';
import { colors as C, fonts as F } from '@/lib/theme';

export function VennDiagramIcon({ size = 36, color = C.ink3 }: { size?: number; color?: string }) {
  const r = size * 0.38;
  const cy = size / 2;
  const cx1 = size / 2 - r * 0.32;
  const cx2 = size / 2 + r * 0.32;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx1} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.045} />
      <Circle cx={cx2} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.045} />
    </Svg>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export function EmptyState({
  icon: Icon,
  customIcon,
  title,
  subtitle,
  actionLabel,
  onAction,
  iconColor = C.ink3,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {customIcon ?? (Icon ? <Icon size={32} color={iconColor} strokeWidth={1.5} /> : null)}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            Haptics.medium();
            onAction();
          }}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: C.ink2,
    fontFamily: F.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  button: {
    borderRadius: 14,
    backgroundColor: C.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: C.bg,
    fontFamily: F.semibold,
    fontSize: 15,
    letterSpacing: -0.1,
  },
});
