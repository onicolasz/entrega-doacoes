import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { type InterestView } from '@entrega/contracts';
import { request } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Badge, Button, Icon, Photo, Screen, State, T, styles } from '../../components/ui';
export default function Conversations() {
  const { user, role } = useAuth();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['interests', user?.id],
    queryFn: () => request<InterestView[]>('/conversations'),
    enabled: !!user,
    refetchInterval: 15000,
  });
  const list = query.data?.filter((i) =>
    role.kind === 'donor'
      ? i.donation.donorId === user?.id
      : i.organization.id === role.organizationId,
  );
  return (
    <Screen title="Conversas">
      {!user ? (
        <>
          <T variant="title">Uma conversa facilita tudo.</T>
          <T muted>Combine os detalhes de cada doação diretamente com a outra parte.</T>
          <Button onPress={() => router.push('/login')}>Entrar ou criar conta</Button>
        </>
      ) : (
        <>
          <T muted>Combine os detalhes e mantenha tudo em um só lugar.</T>
          <State
            loading={query.isPending}
            error={query.error}
            onRetry={() => void query.refetch()}
            empty={
              !query.isPending && !query.error && !list?.length
                ? 'Uma conversa começa quando você solicita ou oferece uma doação.'
                : undefined
            }
          />
          {list?.map((i) => (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={`Conversar sobre ${i.donation.title}`}
              onPress={() => router.push(`/chat/${i.id}`)}
              style={[styles.card, { padding: 16, gap: 12 }]}
            >
              <View style={styles.row}>
                <Photo
                  uri={i.donation.photos[0]}
                  label={i.donation.title}
                  style={{ width: 54, height: 54, borderRadius: 12 }}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="label">{i.donation.title}</T>
                  <T variant="small" muted>
                    {i.donation.donorId === user.id ? i.organization.name : i.donation.donorName}
                  </T>
                </View>
                <Icon name="chatbubble-outline" size={20} />
              </View>
              <Badge status={i.match?.status || i.status} />
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
