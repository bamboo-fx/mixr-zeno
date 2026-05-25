import { Stack } from "expo-router";
import { MixerArrivalGate } from "@/components/mixer/MixerArrivalGate";
import { MixerRatingGate } from "@/components/mixer/MixerRatingGate";

export default function AppLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <MixerArrivalGate />
      <MixerRatingGate />
    </>
  );
}
