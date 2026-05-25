import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors as C, fonts as F } from '@/lib/theme';

interface PillProps {
  text: string;
}

export function Pill({ text }: PillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: C.surface2,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontFamily: F.bold,
    color: C.ink2,
    letterSpacing: 0.4,
  },
});
