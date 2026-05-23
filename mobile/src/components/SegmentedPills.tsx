import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DS } from '@/lib/ds';

interface SegmentedPillsProps {
  items: string[];
  selected: number;
  onSelect: (index: number) => void;
}

export function SegmentedPills({ items, selected, onSelect }: SegmentedPillsProps) {
  const handlePress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(index);
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isSelected = selected === index;
        return (
          <Pressable
            key={index}
            onPress={() => handlePress(index)}
            style={[
              styles.segment,
              isSelected && styles.segmentSelected,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: DS.Spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    borderWidth: DS.Stroke.hairline,
    borderColor: DS.Color.stroke,
  },
  segmentSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text2,
  },
  segmentTextSelected: {
    color: DS.Color.bg,
  },
});
