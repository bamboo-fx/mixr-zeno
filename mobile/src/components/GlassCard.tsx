import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors as C } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  style?: ViewStyle;
}

export function GlassCard({
  children,
  padding = 16,
  style,
}: GlassCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
  },
});
