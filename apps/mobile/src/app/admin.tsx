import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type OrganizationView, type ReportView } from '@entrega/contracts';
import { request, errorText } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { Button, Input, Photo, Screen, State, T, colors, styles } from '../components/ui';
export default function Admin() {
  const { user } = useRequiredAuth();
  const client = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');
  const queue = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => request<OrganizationView[]>('/admin/organizations'),
    enabled: !!user?.admin,
  });
  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => request<ReportView[]>('/admin/reports'),
    enabled: !!user?.admin,
  });
  async function action(id: string, path: string, body: unknown) {
    setBusy(id);
    setError('');
    try {
      await request(path, { method: 'POST', body });
      await client.invalidateQueries();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(undefined);
    }
  }
  if (user && !user.admin)
    return (
      <Screen title="Administração" back>
        <T>Acesso exclusivo da administração.</T>
      </Screen>
    );
  return (
    <Screen title="Administração" back>
      <T variant="title">Instituições para analisar</T>
      {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      <State
        loading={queue.isPending}
        error={queue.error}
        onRetry={() => void queue.refetch()}
        empty={
          !queue.isPending && !queue.error && !queue.data?.length
            ? 'Nenhum cadastro pendente.'
            : undefined
        }
      />
      {queue.data?.map((o) => (
        <View key={o.id} style={[styles.card, { gap: 12 }]}>
          <T variant="subtitle">{o.name}</T>
          <T>{o.description}</T>
          <T muted>
            {o.street}, {o.number}, {o.neighborhood}, {o.city}
          </T>
          <T>
            {o.email} · {o.phone}
          </T>
          {o.cnpj ? <T>CNPJ: {o.cnpj}</T> : null}
          <T variant="label">Informações para análise</T>
          <T selectable>{o.evidence}</T>
          {o.evidencePhotos?.map((uri, index) => (
            <Photo key={uri} uri={uri} label={`Comprovante ${index + 1}`} style={{ height: 250 }} />
          ))}
          <Input
            label="Retorno para a instituição"
            value={notes[o.id] || ''}
            onChangeText={(v) => setNotes({ ...notes, [o.id]: v })}
            multiline
          />
          <Button
            busy={busy === o.id}
            onPress={() =>
              void action(o.id, `/admin/organizations/${o.id}/review`, {
                status: 'APPROVED',
                note: notes[o.id] || '',
              })
            }
          >
            Aprovar instituição
          </Button>
          <Button
            secondary
            disabled={busy === o.id || !notes[o.id]?.trim()}
            onPress={() =>
              void action(o.id, `/admin/organizations/${o.id}/review`, {
                status: 'REJECTED',
                note: notes[o.id],
              })
            }
          >
            Pedir ajustes no cadastro
          </Button>
        </View>
      ))}
      <T variant="title">Denúncias recebidas</T>
      <State
        loading={reports.isPending}
        error={reports.error}
        onRetry={() => void reports.refetch()}
        empty={
          !reports.isPending && !reports.error && !reports.data?.length
            ? 'Nenhuma denúncia aberta.'
            : undefined
        }
      />
      {reports.data?.map((r) => (
        <View key={r.id} style={[styles.card, { gap: 12 }]}>
          <T variant="label">
            {r.targetType === 'DONATION'
              ? 'Doação'
              : r.targetType === 'ORGANIZATION'
                ? 'Instituição'
                : 'Usuário'}
          </T>
          <T variant="small" muted selectable>
            {r.targetId}
          </T>
          <T>{r.reason}</T>
          <Input
            label="Análise e providências"
            multiline
            value={notes[r.id] || ''}
            onChangeText={(v) => setNotes({ ...notes, [r.id]: v })}
          />
          <Button
            busy={busy === r.id}
            disabled={!notes[r.id]?.trim()}
            onPress={() =>
              void action(r.id, `/admin/reports/${r.id}/resolve`, { resolution: notes[r.id] })
            }
          >
            Registrar resolução
          </Button>
        </View>
      ))}
    </Screen>
  );
}
