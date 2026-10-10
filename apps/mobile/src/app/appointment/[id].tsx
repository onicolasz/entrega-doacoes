import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { appointmentSchema, modes, modeLabels, type AppointmentInput } from '@entrega/contracts';
import { request, errorText } from '../../lib/api';
import { useRequiredAuth } from '../../lib/auth';
import { DateTime } from '../../components/date-time';
import { Button, Chip, FormField, Screen, T, colors } from '../../components/ui';
export default function Appointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema) as Resolver<AppointmentInput>,
    defaultValues: {
      scheduledAt: tomorrow.toISOString(),
      mode: 'ORG_PICKUP',
      responsible: user?.name || '',
      trackingUrl: '',
      note: '',
    },
  });
  async function submit() {
    setError('');
    if (!(await form.trigger())) return;
    setBusy(true);
    try {
      await request(`/interests/${id}/appointments`, { method: 'POST', body: form.getValues() });
      await client.invalidateQueries();
      router.replace(`/connection/${id}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Combinar entrega" back>
      <T variant="title">Um horário bom para os dois.</T>
      <T muted>
        A outra parte precisa confirmar. Ao propor outro horário, a confirmação anterior é
        substituída.
      </T>
      <DateTime
        value={form.watch('scheduledAt')}
        onChange={(v) => form.setValue('scheduledAt', v)}
      />
      <T variant="subtitle">Como a doação vai chegar?</T>
      <View style={{ gap: 8 }}>
        {modes.map((m) => (
          <Chip
            key={m}
            label={modeLabels[m]}
            selected={form.watch('mode') === m}
            onPress={() => form.setValue('mode', m)}
          />
        ))}
      </View>
      <FormField
        control={form.control}
        name="responsible"
        label="Responsável pelo transporte"
        placeholder="Nome do responsável ou do serviço"
      />
      {form.watch('mode') === 'EXTERNAL' ? (
        <>
          <T muted>A instituição organiza e paga o transporte externo.</T>
          <FormField
            control={form.control}
            name="trackingUrl"
            label="Link de acompanhamento (opcional)"
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />
        </>
      ) : null}
      <FormField control={form.control} name="note" label="Observações (opcional)" multiline />
      {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      <Button busy={busy} onPress={() => void submit()}>
        Propor horário
      </Button>
    </Screen>
  );
}
