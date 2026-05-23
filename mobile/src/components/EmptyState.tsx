import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { LucideIcon } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

// Venn diagram icon for reuse
export function VennDiagramIcon({ size = 36, color = DS.Color.text3 }: { size?: number; color?: string }) {
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
  iconColor = DS.Color.text3,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* Icon Circle */}
      <View style={styles.iconContainer}>
        <View style={styles.iconInner}>
          {customIcon ?? (Icon ? <Icon size={36} color={iconColor} strokeWidth={1.5} /> : null)}
        </View>
      </View>

      {/* Text */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            Haptics.medium();
            onAction();
          }}
          style={styles.button}
        >
          <LinearGradient
            colors={DS.Grad.accent.colors}
            start={DS.Grad.accent.start}
            end={DS.Grad.accent.end}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: DS.Spacing.xl,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(196, 181, 253, 0.7)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: DS.Spacing.xl,
  },
  button: {
    borderRadius: DS.Radius.xl,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingHorizontal: DS.Spacing.xl,
    paddingVertical: DS.Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: DS.Color.bg,
    fontWeight: '800',
    fontSize: 15,
  },
});
