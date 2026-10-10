import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { type InterestView } from '@entrega/contracts';
import { Badge, Icon, Photo, T, styles } from './ui';
export function ConnectionCard({ item }: { item: InterestView }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Acompanhar ${item.donation.title}`}
      onPress={() => router.push(`/connection/${item.id}`)}
      style={[styles.card, { padding: 16, gap: 14 }]}
    >
      <View style={styles.row}>
        <Photo
          uri={item.donation.photos[0]}
          label={item.donation.title}
          style={{ width: 64, height: 64, borderRadius: 12 }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="label">{item.donation.title}</T>
          <T variant="small" muted>
            {item.organization.name}
          </T>
        </View>
        <Icon name="chevron-forward" size={18} />
      </View>
      <View style={styles.between}>
        <Badge status={item.match?.status || item.status} />
        <T variant="small" muted>
          {item.direction === 'OFFER' ? 'Oferta direta' : 'Solicitação'}
        </T>
      </View>
    </Pressable>
  );
}
