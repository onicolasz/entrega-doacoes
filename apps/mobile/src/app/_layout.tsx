import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../lib/auth';
import { enableNotifications, validNoticePath } from '../lib/notifications';
import { RequestError } from '../lib/api';
void SplashScreen.preventAutoHideAsync().catch(() => {});
const query = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      retry: (count, error) =>
        count < 1 &&
        (!(error instanceof RequestError) || error.status === 0 || error.status >= 500),
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
function Navigation() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (user) void enableNotifications(false).catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const listener = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      if (validNoticePath(path)) router.push(path as '/profile');
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const path = response?.notification.request.content.data?.path;
      if (validNoticePath(path)) router.push(path as '/profile');
    });
    return () => listener.remove();
  }, [router]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F9F8' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="donate" />
        <Stack.Screen name="organization-form" />
        <Stack.Screen name="appointment/[id]" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => sub.remove();
  }, []);
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={query}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
