import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#211621' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
