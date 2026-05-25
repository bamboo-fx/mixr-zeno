// Web stub for the Map tab — react-native-maps is native-only and
// crashes the web bundle. The map route is hidden from the tab bar
// via `href: null` in (tabs)/_layout.tsx, so this only renders if
// someone navigates here directly on web.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors as C, fonts as F } from '@/lib/theme';

export default function MapScreenWeb() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.sub}>Available in the mobile app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: { color: C.ink, fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5, marginBottom: 8 },
  sub: { color: C.ink2, fontFamily: F.regular, fontSize: 14, textAlign: 'center' },
});
