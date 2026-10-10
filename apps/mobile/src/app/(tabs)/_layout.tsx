import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, lineHeight: 16 },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Descobrir',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              accessible={false}
              aria-hidden
              name="compass-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="donations"
        options={{
          title: 'Doações',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              accessible={false}
              aria-hidden
              name="heart-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              accessible={false}
              aria-hidden
              name="chatbubble-ellipses-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              accessible={false}
              aria-hidden
              name="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
