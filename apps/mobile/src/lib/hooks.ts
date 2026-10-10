import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
export function useDebounced<T>(value: T, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
export async function currentLocation() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) {
    if (Platform.OS !== 'web')
      Alert.alert(
        'Localização desativada',
        'Você também pode encontrar doações informando a cidade.',
        [
          { text: 'Continuar sem localização' },
          { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
        ],
      );
    return null;
  }
  return (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
}
export function searchParams(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined && v !== '') params.set(k, String(v));
  return params.toString();
}
