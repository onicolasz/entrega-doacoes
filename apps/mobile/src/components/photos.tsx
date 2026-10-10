import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';
import * as Picker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useQuery } from '@tanstack/react-query';
import { request, uploadPhoto } from '../lib/api';
import { Button, Icon, Photo, T, colors, showError, styles } from './ui';
export function Photos({
  keys,
  onChange,
  max = 6,
  label = 'Fotos do item',
  onBusy,
}: {
  keys: string[];
  onChange: (keys: string[]) => void;
  max?: number;
  label?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const urls = useQuery({
    queryKey: ['own-photos', keys],
    queryFn: () => request<string[]>('/uploads/urls', { method: 'POST', body: { keys } }),
    enabled: keys.length > 0,
    staleTime: 20 * 60 * 1000,
  });
  async function pick(camera = false) {
    try {
      // The system photo picker grants access to the selected images only.
      if (camera && !(await Picker.requestCameraPermissionsAsync()).granted) {
        if (Platform.OS === 'web')
          showError(new Error('Permita acesso às fotos ou à câmera no navegador.'));
        else
          Alert.alert('Permissão necessária', 'Permita acesso para adicionar uma foto.', [
            { text: 'Agora não' },
            { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
          ]);
        return;
      }
      const result = camera
        ? await Picker.launchCameraAsync({ quality: 0.85 })
        : await Picker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsMultipleSelection: true,
            selectionLimit: max - keys.length,
          });
      if (result.canceled) return;
      setBusy(true);
      onBusy?.(true);
      const added: string[] = [];
      for (const asset of result.assets.slice(0, max - keys.length)) {
        const context = ImageManipulator.manipulate(asset.uri);
        if (asset.width > 1600) context.resize({ width: 1600 });
        const image = await context.renderAsync();
        const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        added.push(await uploadPhoto(saved.uri));
        onChange([...keys, ...added]);
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <View style={styles.stack}>
      <T variant="label">{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {keys.map((key, index) => (
          <View key={key}>
            <Photo
              uri={urls.data?.[index]}
              label={`Foto ${index + 1}`}
              style={{ width: 94, height: 94, borderRadius: 14 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover foto ${index + 1}`}
              disabled={busy}
              onPress={() => onChange(keys.filter((k) => k !== key))}
              style={{
                position: 'absolute',
                right: 4,
                top: 4,
                padding: 5,
                backgroundColor: colors.surface,
                borderRadius: 20,
              }}
            >
              <Icon name="close" size={16} />
            </Pressable>
          </View>
        ))}
      </View>
      {keys.length < max ? (
        <View style={{ gap: 10 }}>
          <Button secondary busy={busy} icon="images-outline" onPress={() => void pick(false)}>
            Escolher fotos
          </Button>
          {Platform.OS !== 'web' ? (
            <Button secondary disabled={busy} icon="camera-outline" onPress={() => void pick(true)}>
              Tirar foto
            </Button>
          ) : null}
        </View>
      ) : null}
      <T variant="small" muted>
        {keys.length}/{max} fotos · JPEG, PNG ou WebP. As imagens são preparadas para economizar
        dados.
      </T>
    </View>
  );
}
