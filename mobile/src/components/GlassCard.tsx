import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { DS } from '@/lib/ds';

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  style?: ViewStyle;
}

export function GlassCard({
  children,
  padding = DS.Spacing.lg,
  style,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          padding,
          shadowOpacity: DS.Shadow.soft.opacity,
          shadowRadius: DS.Shadow.soft.radius,
          shadowOffset: { width: 0, height: DS.Shadow.soft.y },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.lg,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
    shadowColor: '#000',
  },
});
