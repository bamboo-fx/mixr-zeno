import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check, ChevronRight } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassCardProps {
  children?: React.ReactNode;
  selected?: boolean;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  style?: ViewStyle;
}

export function GlassCard({
  children,
  selected = false,
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = false,
  style,
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.card,
        selected ? styles.cardSelected : styles.cardDefault,
        selected && styles.cardSelectedShadow,
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon && (
          <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : styles.iconWrapDefault]}>
            {icon}
          </View>
        )}

        <View style={styles.content}>
          {title && (
            <Text style={[styles.title, selected ? styles.titleSelected : styles.titleDefault]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          {children}
        </View>

        {selected ? (
          <View style={styles.checkWrap}>
            <Check size={14} color="white" strokeWidth={2.5} />
          </View>
        ) : rightElement ? (
          <View>{rightElement}</View>
        ) : showChevron ? (
          <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: '#111111',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSelected: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: '#3AE3A0',
  },
  cardSelectedShadow: {
    shadowColor: '#3AE3A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  inner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(168,85,247,0.3)',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleDefault: {
    color: '#FFFFFF',
  },
  titleSelected: {
    color: '#E9D5FF',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3AE3A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
