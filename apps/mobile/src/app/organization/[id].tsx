import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { categoryLabels, type OrganizationView } from '@entrega/contracts';
import { request } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Chip, Icon, Photo, Screen, State, T, styles } from '../../components/ui';
export default function OrganizationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['organization', id],
    queryFn: () => request<OrganizationView>(`/organizations/${id}`),
  });
  const o = query.data;
  return (
    <Screen title="Instituição" back>
      <State loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {o ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {o.photos.length ? (
              o.photos.map((uri, index) => (
                <Photo
                  key={uri}
                  uri={uri}
                  label={`${o.name}, foto ${index + 1}`}
                  style={{ width: 290, height: 230 }}
                />
              ))
            ) : (
              <Photo label={o.name} style={{ width: 290, height: 230 }} />
            )}
          </ScrollView>
          <View style={styles.row}>
            <Icon name="checkmark-circle" size={20} />
            <T variant="small" muted>
              Instituição verificada pela equipe
            </T>
          </View>
          <T variant="hero">{o.name}</T>
          <T>{o.description}</T>
          <View style={[styles.card, { gap: 12 }]}>
            <T variant="subtitle">O que faz falta agora</T>
            <T>{o.needs}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.categories.map((c) => (
                <Chip key={c} label={categoryLabels[c]} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <T variant="subtitle">Onde estamos</T>
            <T>
              {o.street}, {o.number}
            </T>
            <T muted>
              {o.neighborhood}, {o.city} — {o.state}
            </T>
            {o.complement ? <T muted>{o.complement}</T> : null}
          </View>
          <Button onPress={() => router.push(user ? `/offer?organizationId=${id}` : '/login')}>
            Oferecer uma doação
          </Button>
          {user?.organizations.some((org) => org.id === id) ? (
            <Button secondary onPress={() => router.push(`/organization-form?id=${id}`)}>
              Editar cadastro
            </Button>
          ) : null}
          <Button
            secondary
            onPress={() =>
              router.push(user ? `/report?targetType=ORGANIZATION&targetId=${id}` : '/login')
            }
          >
            Denunciar instituição
          </Button>
        </>
      ) : null}
    </Screen>
  );
}
