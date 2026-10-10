import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { modeLabels, statusLabels, type InterestView } from '@entrega/contracts';
import { request } from '../../lib/api';
import { useRequiredAuth } from '../../lib/auth';
import {
  Badge,
  Button,
  Icon,
  Photo,
  Screen,
  State,
  T,
  askConfirm,
  colors,
  showError,
  styles,
} from '../../components/ui';
const steps = ['RESERVED', 'SCHEDULED', 'IN_TRANSIT', 'RECEIVED'];
export default function Connection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['interest', id],
    queryFn: () => request<InterestView>(`/interests/${id}`),
    enabled: !!user,
    refetchInterval: 5000,
  });
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      request<InterestView>(`/interests/${id}${path}`, { method: 'POST', body }),
    onSuccess: async (data) => {
      client.setQueryData(['interest', id], data);
      await client.invalidateQueries();
    },
  });
  const i = query.data;
  const donor = i?.donation.donorId === user?.id;
  const match = i?.match;
  const appointment = match?.appointments.find((a) => ['PROPOSED', 'CONFIRMED'].includes(a.status));
  const live = match && !['RECEIVED', 'CANCELLED'].includes(match.status);
  const confirm =
    appointment?.status === 'PROPOSED' &&
    (appointment.proposedBy === i?.donation.donorId) !== donor;
  const canTransit =
    match?.status === 'SCHEDULED' &&
    appointment?.status === 'CONFIRMED' &&
    (appointment.mode === 'DONOR_DELIVERY') === donor;
  function send(path: string, body?: unknown) {
    action.mutate({ path, body });
  }
  return (
    <Screen title="Sua conexão" back>
      <State loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {i ? (
        <>
          <View style={styles.row}>
            <Photo
              uri={i.donation.photos[0]}
              label={i.donation.title}
              style={{ width: 78, height: 78, borderRadius: 16 }}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <T variant="subtitle">{i.donation.title}</T>
              <T variant="small" muted>
                {i.organization.name}
              </T>
              <Badge status={match?.status || i.status} />
            </View>
          </View>
          <Button secondary icon="chatbubble-outline" onPress={() => router.push(`/chat/${id}`)}>
            Abrir conversa
          </Button>
          {action.error ? <State error={action.error} /> : null}
          {i.status === 'PENDING' ? (
            <>
              <T variant="title">
                {i.canAccept ? 'Vamos fazer essa doação acontecer?' : 'Aguardando a outra parte.'}
              </T>
              <T muted>
                {i.canAccept
                  ? 'Ao aceitar, este lote fica reservado para esta instituição. Depois vocês combinam a entrega.'
                  : 'Enquanto isso, vocês podem conversar para tirar dúvidas.'}
              </T>
              {i.canAccept ? (
                <>
                  <Button
                    busy={action.isPending}
                    onPress={() => send('/respond', { action: 'accept' })}
                  >
                    Aceitar e reservar
                  </Button>
                  <Button
                    secondary
                    danger
                    disabled={action.isPending}
                    onPress={() =>
                      askConfirm('Recusar solicitação', 'A doação continuará disponível.', () =>
                        send('/respond', { action: 'decline' }),
                      )
                    }
                  >
                    Recusar
                  </Button>
                </>
              ) : i.canWithdraw ? (
                <Button
                  secondary
                  disabled={action.isPending}
                  onPress={() =>
                    askConfirm(
                      'Retirar solicitação',
                      'Você poderá fazer uma nova solicitação depois.',
                      () => send('/respond', { action: 'withdraw' }),
                    )
                  }
                >
                  Retirar solicitação
                </Button>
              ) : null}
            </>
          ) : null}
          {match ? (
            <>
              <T variant="subtitle">Acompanhe a doação</T>
              <View style={{ gap: 0 }}>
                {steps.map((s, index) => {
                  const complete = steps.indexOf(match.status) >= index;
                  return (
                    <View key={s} style={{ flexDirection: 'row', gap: 14, minHeight: 52 }}>
                      <View style={{ alignItems: 'center', width: 26 }}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: complete ? colors.green : colors.line,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {complete ? <Icon name="checkmark" color="white" size={15} /> : null}
                        </View>
                        {index < steps.length - 1 ? (
                          <View
                            style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: complete ? colors.green : colors.line,
                              marginVertical: 4,
                            }}
                          />
                        ) : null}
                      </View>
                      <T variant="label" style={{ color: complete ? colors.ink : colors.muted }}>
                        {statusLabels[s]}
                      </T>
                    </View>
                  );
                })}
              </View>
              {appointment ? (
                <View style={[styles.card, { gap: 10 }]}>
                  <Badge status={appointment.status} />
                  <T variant="subtitle">
                    {new Date(appointment.scheduledAt).toLocaleString('pt-BR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </T>
                  <T>{modeLabels[appointment.mode]}</T>
                  <T muted>Responsável: {appointment.responsible}</T>
                  {appointment.note ? <T>{appointment.note}</T> : null}
                  {appointment.trackingUrl ? (
                    <Button
                      secondary
                      onPress={() =>
                        void Linking.openURL(appointment.trackingUrl!).catch(showError)
                      }
                    >
                      Acompanhar transporte
                    </Button>
                  ) : null}
                  {confirm ? (
                    <Button
                      busy={action.isPending}
                      onPress={() => send(`/appointments/${appointment.id}/confirm`)}
                    >
                      Confirmar este horário
                    </Button>
                  ) : appointment.status === 'PROPOSED' ? (
                    <T variant="small" muted>
                      A outra parte precisa confirmar este horário.
                    </T>
                  ) : null}
                </View>
              ) : null}
              {live && ['RESERVED', 'SCHEDULED'].includes(match.status) ? (
                <Button secondary onPress={() => router.push(`/appointment/${id}`)}>
                  {appointment ? 'Propor outro horário' : 'Combinar horário de entrega'}
                </Button>
              ) : null}
              {canTransit ? (
                <Button
                  busy={action.isPending}
                  onPress={() => send('/status', { action: 'transit' })}
                >
                  Iniciar transporte
                </Button>
              ) : null}
              {!donor && ['SCHEDULED', 'IN_TRANSIT'].includes(match.status) ? (
                <Button
                  busy={action.isPending}
                  onPress={() =>
                    askConfirm(
                      'Confirmar recebimento',
                      'Confirme somente quando a doação chegar à instituição.',
                      () => send('/status', { action: 'receive' }),
                    )
                  }
                >
                  Confirmar recebimento
                </Button>
              ) : null}
              {match.status === 'RECEIVED' ? (
                <View
                  style={[styles.card, { backgroundColor: colors.mint, gap: 10, borderWidth: 0 }]}
                >
                  <Icon name="heart" size={30} />
                  <T variant="title">Doação recebida!</T>
                  <T>Essa conexão fez a diferença. Obrigado por fazer parte.</T>
                </View>
              ) : null}
              {i.donation.street ? (
                <View style={[styles.card, { gap: 8 }]}>
                  <T variant="subtitle">Endereço de retirada</T>
                  <T>
                    {i.donation.street}, {i.donation.number}
                  </T>
                  <T muted>
                    {i.donation.neighborhood}, {i.donation.city}
                  </T>
                  {i.donation.complement ? <T>{i.donation.complement}</T> : null}
                  {i.donation.instructions ? <T>{i.donation.instructions}</T> : null}
                  <Button
                    secondary
                    icon="navigate-outline"
                    onPress={() =>
                      void Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${i.donation.street} ${i.donation.number} ${i.donation.city} ${i.donation.state}`)}`,
                      ).catch(showError)
                    }
                  >
                    Abrir rota
                  </Button>
                </View>
              ) : null}
              <View style={[styles.card, { gap: 8 }]}>
                <T variant="subtitle">Destino da doação</T>
                <T>{i.organization.name}</T>
                <T muted>
                  {i.organization.street}, {i.organization.number} — {i.organization.city}
                </T>
              </View>
              {live ? (
                <Button
                  secondary
                  danger
                  disabled={action.isPending}
                  onPress={() =>
                    askConfirm(
                      'Cancelar entrega',
                      'O anúncio voltará a ficar disponível para outras instituições.',
                      () => send('/status', { action: 'cancel' }),
                    )
                  }
                >
                  Cancelar entrega
                </Button>
              ) : null}
            </>
          ) : null}
          {!match && i.status !== 'PENDING' ? (
            <T muted>
              Esta solicitação foi encerrada. Você pode continuar descobrindo outras conexões.
            </T>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
