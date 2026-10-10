import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  categories,
  categoryLabels,
  organizationSchema,
  type OrganizationInput,
  type OrganizationView,
} from '@entrega/contracts';
import { request, errorText } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { currentLocation } from '../lib/hooks';
import { AddressFields } from '../components/address';
import { Photos } from '../components/photos';
import { Button, Chip, FormField, Screen, State, T, colors, showError } from '../components/ui';
export default function OrganizationForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, refreshUser, setRole } = useRequiredAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema) as Resolver<OrganizationInput>,
    defaultValues: {
      name: '',
      kind: 'COLLECTIVE',
      description: '',
      email: user?.email || '',
      phone: '',
      cnpj: '',
      evidence: '',
      evidenceKeys: [],
      city: 'Porto Alegre',
      state: 'RS',
      neighborhood: '',
      street: '',
      number: '',
      complement: '',
      photoKeys: [],
      categories: ['FOOD'],
      needs: '',
    },
  });
  const info = useQuery({
    queryKey: ['organization-manage', id],
    queryFn: () =>
      request<OrganizationView & { evidenceKeys: string[] }>(`/organizations/${id}/manage`),
    enabled: !!id && !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (info.data)
      form.reset({
        ...form.getValues(),
        ...info.data,
        kind: info.data.kind as OrganizationInput['kind'],
      });
    else if (user && !id) form.setValue('email', user.email);
  }, [info.data, user?.email, id, form]);
  async function submit(data: OrganizationInput) {
    setBusy(true);
    setError('');
    try {
      const o = await request<OrganizationView>(id ? `/organizations/${id}` : '/organizations', {
        method: id ? 'PATCH' : 'POST',
        body: data,
      });
      await refreshUser();
      setRole({ kind: 'organization', organizationId: o.id });
      await client.invalidateQueries();
      router.replace('/profile');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <Screen title="Instituição">
        <State loading />
      </Screen>
    );
  if (id && (info.isPending || info.error))
    return (
      <Screen title="Instituição" back>
        <State loading={info.isPending} error={info.error} onRetry={() => void info.refetch()} />
      </Screen>
    );
  return (
    <Screen title={id ? 'Editar instituição' : 'Cadastrar instituição'} back>
      <T variant="title">Uma nova conexão com a comunidade.</T>
      <T muted>
        Seu cadastro será analisado antes de começar a receber doações. Alterações no cadastro
        também passam por análise.
      </T>
      <FormField control={form.control} name="name" label="Nome da instituição" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            ['NGO', 'ONG'],
            ['COLLECTIVE', 'Coletivo'],
            ['COLLECTION_POINT', 'Ponto de arrecadação'],
          ] as const
        ).map(([kind, label]) => (
          <Chip
            key={kind}
            label={label}
            selected={form.watch('kind') === kind}
            onPress={() => form.setValue('kind', kind)}
          />
        ))}
      </View>
      {form.watch('kind') === 'NGO' ? (
        <FormField control={form.control} name="cnpj" label="CNPJ" keyboardType="number-pad" />
      ) : null}
      <FormField
        control={form.control}
        name="description"
        label="Conte sobre o trabalho da instituição"
        multiline
      />
      <Photos
        keys={form.watch('photoKeys')}
        onChange={(keys) => form.setValue('photoKeys', keys)}
        label="Fotos da instituição (opcional)"
        onBusy={setPhotoBusy}
      />
      <FormField
        control={form.control}
        name="email"
        label="Email de contato"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="phone"
        label="Telefone de contato"
        keyboardType="phone-pad"
      />
      <T variant="subtitle">O que vocês recebem</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c) => (
          <Chip
            key={c}
            label={categoryLabels[c]}
            selected={form.watch('categories').includes(c)}
            onPress={() =>
              form.setValue(
                'categories',
                form.getValues('categories').includes(c)
                  ? form.getValues('categories').filter((v) => v !== c)
                  : [...form.getValues('categories'), c],
                { shouldValidate: true },
              )
            }
          />
        ))}
      </View>
      {form.formState.errors.categories ? (
        <T style={{ color: colors.danger }}>{form.formState.errors.categories.message}</T>
      ) : null}
      <FormField
        control={form.control}
        name="needs"
        label="Necessidades atuais"
        multiline
        placeholder="Ex.: Alimentos não perecíveis e roupas infantis"
      />
      <T variant="subtitle">Onde vocês estão</T>
      <AddressFields control={form.control} />
      <Button
        secondary
        onPress={() =>
          void currentLocation()
            .then((c) => {
              if (c) {
                form.setValue('latitude', c.latitude);
                form.setValue('longitude', c.longitude);
              }
            })
            .catch(showError)
        }
      >
        Usar localização da instituição
      </Button>
      <T variant="subtitle">Informações para análise</T>
      <FormField
        control={form.control}
        name="evidence"
        label="Responsável e referências"
        multiline
        helper="Informe o responsável e links ou informações que comprovem o trabalho da instituição. Esses dados ficam restritos à análise."
      />
      <Photos
        keys={form.watch('evidenceKeys')}
        onChange={(keys) => form.setValue('evidenceKeys', keys)}
        max={3}
        label="Fotos de documentos ou comprovantes (opcional)"
        onBusy={setPhotoBusy}
      />
      {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      {!user.verified ? (
        <T style={{ color: colors.warning }}>Confirme seu email antes de enviar o cadastro.</T>
      ) : null}
      <Button
        busy={busy}
        disabled={photoBusy || !user.verified}
        onPress={() => void form.handleSubmit(submit)()}
      >
        Enviar para análise
      </Button>
    </Screen>
  );
}
