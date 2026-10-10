import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type NoticeView } from '@entrega/contracts';
import { request } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { validNoticePath } from '../lib/notifications';
import { Screen, State, T, colors, styles } from '../components/ui';
export default function Notices() {
  const { user } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['notices', user?.id],
    queryFn: () => request<NoticeView[]>('/notices'),
    enabled: !!user,
    refetchInterval: 15000,
  });
  async function open(n: NoticeView) {
    await request(`/notices/${n.id}/read`, { method: 'POST' });
    await client.invalidateQueries({ queryKey: ['notices'] });
    if (validNoticePath(n.path)) router.push(n.path);
  }
  return (
    <Screen title="Novidades" back>
      <State
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={
          !query.isPending && !query.error && !query.data?.length
            ? 'Suas novidades aparecerão aqui quando uma conexão acontecer.'
            : undefined
        }
      />
      {query.data?.map((n) => (
        <Pressable
          key={n.id}
          accessibilityRole="button"
          onPress={() => void open(n)}
          style={[
            styles.card,
            { gap: 7, backgroundColor: n.readAt ? colors.surface : colors.mint },
          ]}
        >
          <T variant="label">{n.title}</T>
          <T>{n.body}</T>
          <T variant="small" muted>
            {new Date(n.createdAt).toLocaleString('pt-BR')}
          </T>
        </Pressable>
      ))}
    </Screen>
  );
}
