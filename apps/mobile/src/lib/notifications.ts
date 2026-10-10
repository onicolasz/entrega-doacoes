import { Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
export async function enableNotifications(ask = true) {
  if (Platform.OS === 'web' || !Device.isDevice) {
    if (ask)
      Alert.alert(
        'Use o aplicativo no celular',
        'As notificações estão disponíveis no app instalado.',
      );
    return;
  }
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Doações e conversas',
      importance: Notifications.AndroidImportance.HIGH,
    });
  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted' && ask)
    permissions = await Notifications.requestPermissionsAsync();
  if (permissions.status !== 'granted') {
    if (ask)
      Alert.alert('Notificações desativadas', 'Você pode ativá-las nas configurações do celular.', [
        { text: 'Agora não' },
        { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
      ]);
    return;
  }
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    if (ask)
      Alert.alert(
        'Notificações indisponíveis',
        'As notificações ainda não estão disponíveis nesta instalação.',
      );
    return;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await request('/devices', { method: 'POST', body: { token: data } });
  await AsyncStorage.setItem('entrega-push-token', data);
  if (ask) Alert.alert('Tudo certo', 'Você receberá novidades sobre suas doações e conversas.');
}
export function validNoticePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (/^\/(connection|chat)\/[a-f0-9-]{36}$/.test(value) || value === '/profile')
  );
}
