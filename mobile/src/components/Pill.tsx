import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DS } from '@/lib/ds';

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
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: DS.Color.panel2,
    borderRadius: 100,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text2,
    letterSpacing: 0.3,
  },
});
