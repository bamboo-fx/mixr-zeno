import React from 'react';
import { Text, View, StyleSheet, ViewStyle } from 'react-native';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, style }: StatCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
    gap: 4,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    color: '#A0A0A0',
  },
});
