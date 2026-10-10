import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type DonationView, type OrganizationView, type InterestView } from '@entrega/contracts';
import { request } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { useDebounced, searchParams } from '../lib/hooks';
import { Button, DonationCard, Input, OrganizationCard, Screen, State, T } from '../components/ui';
export default function Offer() {
  const { donationId, organizationId } = useLocalSearchParams<{
    donationId?: string;
    organizationId?: string;
  }>();
  const { user } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('Porto Alegre');
  const filters = { q: useDebounced(q), city: useDebounced(city) };
  const items = useQuery({
    queryKey: ['my-donations', user?.id],
    queryFn: () => request<DonationView[]>('/donations/mine'),
    enabled: !!user,
  });
  const item = items.data?.find((d) => d.id === donationId);
  const org = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => request<OrganizationView>(`/organizations/${organizationId}`),
    enabled: !!organizationId,
  });
  const orgs = useQuery({
    queryKey: ['offer-organizations', filters, item?.category],
    queryFn: () =>
      request<OrganizationView[]>(
        `/organizations?${searchParams({ ...filters, category: item?.category })}`,
      ),
    enabled: !!donationId && !!item,
  });
  const mutation = useMutation({
    mutationFn: ({ d, o }: { d: string; o: string }) =>
      request<InterestView>(`/donations/${d}/interests`, {
        method: 'POST',
        body: { organizationId: o, direction: 'OFFER' },
      }),
    onSuccess: async (i) => {
      await client.invalidateQueries();
      router.replace(`/connection/${i.id}`);
    },
  });
  const available = items.data?.filter(
    (d) => d.status === 'AVAILABLE' && (!org.data || org.data.categories.includes(d.category)),
  );
  return (
    <Screen title="Oferecer doação" back>
      <T variant="title">
        {organizationId ? 'Qual item você quer oferecer?' : 'Escolha quem vai receber.'}
      </T>
      <T muted>Enviamos a oferta para a instituição. A reserva acontece quando ela aceitar.</T>
      {mutation.error ? <State error={mutation.error} /> : null}
      {mutation.isPending ? (
        <State loading />
      ) : donationId ? (
        <>
          <Input
            placeholder="Buscar instituição"
            accessibilityLabel="Buscar instituição"
            value={q}
            onChangeText={setQ}
          />
          <Input label="Cidade" value={city} onChangeText={setCity} />
          <State
            loading={items.isPending || (!!item && orgs.isPending)}
            error={items.error || orgs.error}
            onRetry={() => {
              void items.refetch();
              void orgs.refetch();
            }}
            empty={
              !items.isPending && (!item || (!orgs.isPending && !orgs.data?.length))
                ? !item
                  ? 'Esta doação não está disponível na sua conta.'
                  : 'Nenhuma instituição encontrada para esta categoria. Experimente outra cidade.'
                : undefined
            }
          />
          {orgs.data
            ?.filter((o) => !user?.organizations.some((own) => own.id === o.id))
            .map((o) => (
              <OrganizationCard
                key={o.id}
                item={o}
                onPress={() => mutation.mutate({ d: donationId, o: o.id })}
              />
            ))}
        </>
      ) : (
        <>
          <State
            loading={items.isPending || org.isPending}
            error={items.error || org.error}
            onRetry={() => {
              void items.refetch();
              void org.refetch();
            }}
            empty={
              !items.isPending && !available?.length
                ? 'Você ainda não tem itens disponíveis nas categorias que esta instituição recebe.'
                : undefined
            }
          />
          {available?.map((d) => (
            <DonationCard
              key={d.id}
              item={d}
              onPress={() => organizationId && mutation.mutate({ d: d.id, o: organizationId })}
            />
          ))}
          <Button secondary onPress={() => router.push('/donate')}>
            Cadastrar uma doação
          </Button>
        </>
      )}
    </Screen>
  );
}
