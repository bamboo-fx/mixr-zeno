import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GelBackgroundProps {
  children?: React.ReactNode;
}

/**
 * GelBackground — Light canvas for glass elements.
 */
export function GelBackground({ children }: GelBackgroundProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2e1f2e', '#211621', '#1e131e']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#211621',
  },
});
