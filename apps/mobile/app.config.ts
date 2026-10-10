import type { ExpoConfig } from 'expo/config';
if (
  process.env.EAS_BUILD_PROFILE === 'production' &&
  !process.env.EXPO_PUBLIC_API_URL?.startsWith('https://')
)
  throw new Error('Set EXPO_PUBLIC_API_URL to the production HTTPS API URL');
const config: ExpoConfig = {
  name: 'Entrega Doações',
  slug: 'entrega-doacoes',
  owner: process.env.EAS_PROJECT_OWNER || 'nicolasbarrosdesouza',
  scheme: 'entregadoacoes',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: { supportsTablet: true, bundleIdentifier: 'com.entregadoacoes.mobile' },
  android: {
    package: 'com.entregadoacoes.mobile',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#006B5E' },
    permissions: ['POST_NOTIFICATIONS'],
    softwareKeyboardLayoutMode: 'resize',
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' },
  plugins: [
    'expo-dev-client',
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      { android: { usesCleartextTraffic: process.env.ALLOW_CLEARTEXT_HTTP === 'true' } },
    ],
    [
      'expo-splash-screen',
      { backgroundColor: '#006B5E', image: './assets/adaptive-icon.png', imageWidth: 120 },
    ],
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission: 'Selecione fotos para mostrar os itens que você quer doar.',
        cameraPermission: 'Tire fotos dos itens que você quer doar.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Sua localização ajuda a encontrar instituições e doações perto de você.',
      },
    ],
    ['expo-notifications', { color: '#006B5E' }],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID || '4457a352-200a-4206-a12b-42b634253a21' },
  },
};
export default config;
