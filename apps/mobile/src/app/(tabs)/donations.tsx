import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { type DonationView, type InterestView } from '@entrega/contracts';
import { request } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Chip, DonationCard, Screen, State, T, styles } from '../../components/ui';
import { ConnectionCard } from '../../components/connection-card';
export default function Donations() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [tab, setTab] = useState('items');
  const mine = useQuery({
    queryKey: ['my-donations', user?.id],
    queryFn: () => request<DonationView[]>('/donations/mine'),
    enabled: !!user,
  });
  const connections = useQuery({
    queryKey: ['interests', user?.id],
    queryFn: () => request<InterestView[]>('/interests'),
    enabled: !!user,
    refetchInterval: 15000,
  });
  const items = role.kind === 'donor' && tab === 'items';
  const list = connections.data?.filter((i) =>
    role.kind === 'donor'
      ? i.donation.donorId === user?.id
      : i.organization.id === role.organizationId,
  );
  if (loading)
    return (
      <Screen title="Doações">
        <State loading />
      </Screen>
    );
  if (!user)
    return (
      <Screen title="Suas doações">
        <T variant="title">Acompanhe cada conexão</T>
        <T muted>Entre para cadastrar itens e acompanhar suas doações até o recebimento.</T>
        <Button onPress={() => router.push('/login')}>Entrar ou criar conta</Button>
      </Screen>
    );
  return (
    <Screen title="Doações">
      <T variant="title">
        {role.kind === 'donor' ? 'Cada item tem um novo destino.' : 'Da conversa ao recebimento.'}
      </T>
      {role.kind === 'donor' ? (
        <>
          <View style={styles.row}>
            <Chip label="Meus itens" selected={tab === 'items'} onPress={() => setTab('items')} />
            <Chip
              label="Conexões"
              selected={tab === 'connections'}
              onPress={() => setTab('connections')}
            />
          </View>
          <Button icon="add" onPress={() => router.push('/donate')}>
            Cadastrar doação
          </Button>
        </>
      ) : null}
      <State
        loading={items ? mine.isPending : connections.isPending}
        error={items ? mine.error : connections.error}
        onRetry={() => void (items ? mine.refetch() : connections.refetch())}
        empty={
          items
            ? !mine.isPending && !mine.error && !mine.data?.length
              ? 'Comece com um item que você já não usa.'
              : undefined
            : !connections.isPending && !connections.error && !list?.length
              ? 'Suas solicitações e ofertas aparecerão aqui.'
              : undefined
        }
      />
      {items
        ? mine.data?.map((d) => (
            <DonationCard
              key={d.id}
              item={d}
              onPress={() =>
                router.push(d.status === 'DRAFT' ? `/donate?id=${d.id}` : `/donation/${d.id}`)
              }
            />
          ))
        : list?.map((i) => <ConnectionCard key={i.id} item={i} />)}
    </Screen>
  );
}
