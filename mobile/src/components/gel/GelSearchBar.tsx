import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Search } from 'lucide-react-native';
import { DS } from '@/lib/ds';

interface GelSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * GelSearchBar — True iOS-native liquid glass search bar.
 * Layered:
 *   1. BlurView base (intensity 55, dark) — real frosted glass
 *   2. LinearGradient overlay — subtle top-light refraction
 *   3. 1px top highlight line — glass edge glint
 *   4. 1px white border — crisp glass edge
 *   5. Content (search icon + input)
 */
export function GelSearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
}: GelSearchBarProps) {
  return (
    <View style={[styles.shadowWrapper, style]}>
      <View style={styles.wrapper}>
        {/* BlurView — frosted glass base */}
        <BlurView
          intensity={55}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        />

        {/* Subtle refractive gradient — top slightly lighter */}
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        />

        {/* 1px top-edge glint */}
        <View style={styles.topHighlight} pointerEvents="none" />

        {/* Content row */}
        <View style={styles.content}>
          <Search
            size={15}
            color="rgba(235,235,245,0.50)"
            strokeWidth={2.2}
          />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(235,235,245,0.35)"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: 14,
  },
  wrapper: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    zIndex: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    position: 'relative',
    zIndex: 3,
  },
  input: {
    flex: 1,
    fontSize: DS.Font.size.md,
    color: '#FFFFFF',
    fontWeight: '400',
    paddingVertical: 0,
    letterSpacing: 0.1,
  },
});
