import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  categoryLabels,
  conditionLabels,
  type DonationView,
  type InterestView,
} from '@entrega/contracts';
import { request } from '../../lib/api';
import { useRequiredAuth } from '../../lib/auth';
import {
  Badge,
  Button,
  Chip,
  Photo,
  Screen,
  State,
  T,
  askConfirm,
  colors,
  styles,
} from '../../components/ui';
import { ConnectionCard } from '../../components/connection-card';
export default function DonationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useRequiredAuth();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string>();
  const query = useQuery({
    queryKey: ['donation', id],
    queryFn: () => request<DonationView>(`/donations/${id}`),
    enabled: !!user,
  });
  const all = useQuery({
    queryKey: ['interests', user?.id],
    queryFn: () => request<InterestView[]>('/interests'),
    enabled: !!user,
  });
  const solicit = useMutation({
    mutationFn: (organizationId: string) =>
      request<InterestView>(`/donations/${id}/interests`, {
        method: 'POST',
        body: { organizationId, direction: 'REQUEST' },
      }),
    onSuccess: async (i) => {
      await client.invalidateQueries();
      router.push(`/connection/${i.id}`);
    },
  });
  const archive = useMutation({
    mutationFn: () => request(`/donations/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await client.invalidateQueries();
      router.replace('/donations');
    },
  });
  const d = query.data;
  const owner = d?.donorId === user?.id;
  const organizations = user?.organizations.filter((o) => o.status === 'APPROVED') || [];
  const target =
    selected || organizations.find((o) => o.id === role.organizationId)?.id || organizations[0]?.id;
  const related = all.data?.filter((i) => i.donation.id === id);
  const canAct = d?.status === 'AVAILABLE';
  return (
    <Screen title="Doação" back>
      <State loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {d ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {d.photos.map((uri, index) => (
              <Photo
                key={uri}
                uri={uri}
                label={`${d.title}, foto ${index + 1}`}
                style={{ width: 290, height: 260 }}
              />
            ))}
          </ScrollView>
          <View style={styles.between}>
            <T variant="small" muted>
              {categoryLabels[d.category]}
            </T>
            <Badge status={d.status} />
          </View>
          <T variant="hero">{d.title}</T>
          <T>{d.description}</T>
          <View style={styles.row}>
            <Chip label={conditionLabels[d.condition]} />
            <Chip label={`${d.quantity} ${d.quantity === 1 ? 'item' : 'itens'}`} />
          </View>
          <View style={[styles.card, { gap: 10 }]}>
            <T variant="subtitle">Local e disponibilidade</T>
            <T>
              {d.street
                ? `${d.street}, ${d.number}${d.complement ? ` · ${d.complement}` : ''}`
                : `${d.neighborhood}, ${d.city}`}
            </T>
            <T muted>{d.availability}</T>
            {d.instructions ? <T>{d.instructions}</T> : null}
            {!d.street ? (
              <T variant="small" muted>
                O endereço completo aparece após a aceitação da doação.
              </T>
            ) : null}
          </View>
          {owner && canAct ? (
            <>
              <Button onPress={() => router.push(`/offer?donationId=${id}`)}>
                Oferecer a uma instituição
              </Button>
              <Button secondary onPress={() => router.push(`/donate?id=${id}`)}>
                Editar doação
              </Button>
              <Button
                secondary
                danger
                busy={archive.isPending}
                onPress={() =>
                  askConfirm('Retirar anúncio', 'A doação deixará de aparecer na busca.', () =>
                    archive.mutate(),
                  )
                }
              >
                Retirar anúncio
              </Button>
            </>
          ) : !owner && canAct ? (
            <>
              <T variant="subtitle">Solicitar para sua instituição</T>
              {organizations.length ? (
                <>
                  <View style={{ gap: 8 }}>
                    {organizations.map((o) => (
                      <Chip
                        key={o.id}
                        label={o.name}
                        selected={target === o.id}
                        onPress={() => setSelected(o.id)}
                      />
                    ))}
                  </View>
                  <Button
                    busy={solicit.isPending}
                    disabled={!user?.verified}
                    onPress={() => target && solicit.mutate(target)}
                  >
                    Solicitar doação
                  </Button>
                </>
              ) : (
                <>
                  <T muted>
                    Sua instituição precisa estar cadastrada e aprovada para receber doações.
                  </T>
                  <Button secondary onPress={() => router.push('/organization-form')}>
                    Cadastrar instituição
                  </Button>
                </>
              )}
            </>
          ) : null}
          {solicit.error || archive.error ? <State error={solicit.error || archive.error} /> : null}
          {related?.length ? (
            <>
              <T variant="subtitle">Conexões deste item</T>
              {related.map((i) => (
                <ConnectionCard key={i.id} item={i} />
              ))}
            </>
          ) : null}
          <T variant="small" muted>
            Doação de {d.donorName}
          </T>
          {!owner ? (
            <Button
              secondary
              onPress={() => router.push(`/report?targetType=DONATION&targetId=${id}`)}
            >
              Denunciar anúncio
            </Button>
          ) : null}
          {!user?.verified ? (
            <T style={{ color: colors.warning }}>Confirme seu email para solicitar uma doação.</T>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
