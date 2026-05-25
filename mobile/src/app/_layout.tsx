import { DarkTheme, ThemeProvider, Theme } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSession } from '@/lib/auth/use-session';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export const unstable_settings = {
  initialRouteName: '(app)',
};

// Deep space theme matching our GelBackground
const MixrDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#211621',
    card: '#211621',
    border: 'rgba(168, 85, 247, 0.25)',
    primary: '#FFE5BC',
    text: '#FFFFFF',
  },
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const setProfile = useAuthStore((s) => s.setProfile);
  const logout = useAuthStore((s) => s.logout);
  const storeProfile = useAuthStore((s) => s.profile);

  // isLoggedIn: true once we have both a server session and a synced local profile.
  // Cleared immediately when logout() is called, so the guard reacts synchronously.
  const isLoggedIn = !!session?.user && !!storeProfile;

  // Fetch profile from DB when session exists
  const { data: dbProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-check', session?.user?.email],
    queryFn: async () => {
      try {
        return await api.profiles.getByEmail(session!.user.email);
      } catch {
        // 404 = no profile yet (new user)
        return null;
      }
    },
    enabled: !!session?.user?.email,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (profileLoading && session?.user) return;

    if (!session?.user) {
      // No session — clear stale local cache
      logout();
      return;
    }

    // Session exists — check if they have a DB profile
    if (dbProfile) {
      // Sync the DB profile into the store (clears any stale cached data)
      setProfile(dbProfile);
      // If they're stuck on sign-in or onboarding, send to app
      if (segments[0] === 'sign-in' || segments[0] === 'onboarding') {
        router.replace('/(app)');
      }
    } else if (!profileLoading) {
      // profileLoading is done and dbProfile is null/undefined — no profile yet, go to onboarding
      if (segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      }
    }
  }, [session, sessionLoading, dbProfile, profileLoading]);

  // Show nothing while loading session (prevents flash of wrong screen)
  if (sessionLoading || (!!session?.user && profileLoading && !storeProfile)) return null;

  return (
    <ThemeProvider value={MixrDarkTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#211621' } }}>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="mixer/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="create-group" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pairing-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="post-story" />
          <Stack.Screen name="post-global-story" />
          <Stack.Screen name="view-global-story" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="privacy-settings" />
          <Stack.Screen name="send-mixer-request" />
          <Stack.Screen name="edit-mixer-request" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edu-verification" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat-room" />
          <Stack.Screen name="dm-chat" />
          <Stack.Screen name="create-open-mixer" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="open-mixer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="open-mixers" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        {/* Onboarding is accessible whenever a session exists but no profile yet */}
        <Stack.Screen name="onboarding" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Medium': PlayfairDisplay_500Medium,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#211621' }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
