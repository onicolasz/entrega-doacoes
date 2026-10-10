import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  categories,
  categoryLabels,
  conditions,
  conditionLabels,
  donationSchema,
  type DonationInput,
  type DonationView,
} from '@entrega/contracts';
import { request, errorText } from '../lib/api';
import { useRequiredAuth } from '../lib/auth';
import { currentLocation } from '../lib/hooks';
import { AddressFields } from '../components/address';
import { Photos } from '../components/photos';
import {
  Button,
  Chip,
  FormField,
  Screen,
  State,
  T,
  colors,
  showError,
  styles,
} from '../components/ui';
const defaults: DonationInput = {
  title: '',
  description: '',
  category: 'CLOTHES',
  condition: 'GOOD',
  quantity: 1,
  photoKeys: [],
  city: 'Porto Alegre',
  state: 'RS',
  neighborhood: '',
  street: '',
  number: '',
  complement: '',
  instructions: '',
  availability: '',
  publish: true,
};
const groups: Path<DonationInput>[][] = [
  ['title', 'description', 'photoKeys'],
  ['category', 'condition', 'quantity'],
  ['city', 'state', 'neighborhood', 'street', 'number', 'availability'],
];
export default function Donate() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useRequiredAuth();
  const query = useQueryClient();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const form = useForm<DonationInput>({
    resolver: zodResolver(donationSchema) as Resolver<DonationInput>,
    defaultValues: defaults,
  });
  const item = useQuery({
    queryKey: ['donation', id],
    queryFn: () => request<DonationView>(`/donations/${id}`),
    enabled: !!id && !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const key = `draft:${user?.id}:${id || 'new'}`;
  useEffect(() => {
    if (!user || (id && !item.data)) return;
    let live = true;
    (async () => {
      let data: DonationInput = { ...defaults, ...(item.data || {}), publish: true };
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        try {
          data = { ...data, ...JSON.parse(saved) };
          if (live) setRecovered(true);
        } catch {
          await AsyncStorage.removeItem(key);
        }
      }
      if (live) {
        form.reset(data);
        setHydrated(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [user?.id, id, item.data?.id, key, form]);
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout>;
    const sub = form.watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => void AsyncStorage.setItem(key, JSON.stringify(values)), 400);
    });
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [hydrated, key, form]);
  async function save(publish: boolean) {
    setError('');
    setBusy(true);
    try {
      const data = form.getValues();
      const saved = await request<DonationView>(id ? `/donations/${id}` : '/donations', {
        method: id ? 'PATCH' : 'POST',
        body: { ...data, publish },
      });
      setHydrated(false);
      await AsyncStorage.removeItem(key);
      await query.invalidateQueries();
      router.replace(publish ? `/donation/${saved.id}` : '/donations');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    setError('');
    if (await form.trigger(groups[step])) {
      Keyboard.dismiss();
      setStep(step + 1);
    }
  }
  if (!user)
    return (
      <Screen title="Cadastrar doação">
        <State loading />
      </Screen>
    );
  if (id && (item.isPending || item.error))
    return (
      <Screen title="Cadastrar doação" back>
        <State loading={item.isPending} error={item.error} onRetry={() => void item.refetch()} />
      </Screen>
    );
  return (
    <Screen key={step} title={id ? 'Editar doação' : 'Cadastrar doação'} back>
      <View style={{ gap: 14 }}>
        <View style={styles.between}>
          <T variant="small" muted>
            Etapa {step + 1} de 3
          </T>
          <T variant="small" muted>
            Rascunho salvo no aparelho
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2].map((n) => (
            <View
              key={n}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 4,
                backgroundColor: n <= step ? colors.green : colors.line,
              }}
            />
          ))}
        </View>
        <T variant="title">
          {
            [
              'Mostre o que você quer doar.',
              'Conte um pouco sobre o item.',
              'Vamos combinar a retirada.',
            ][step]
          }
        </T>
        {recovered ? (
          <T variant="small" style={{ color: colors.green }}>
            Seu rascunho foi recuperado.
          </T>
        ) : null}
      </View>
      {step === 0 ? (
        <>
          <Photos
            keys={form.watch('photoKeys')}
            onChange={(keys) => form.setValue('photoKeys', keys, { shouldValidate: true })}
            onBusy={setUploading}
          />
          {form.formState.errors.photoKeys ? (
            <T variant="small" style={{ color: colors.danger }}>
              {form.formState.errors.photoKeys.message}
            </T>
          ) : null}
          <FormField
            control={form.control}
            name="title"
            label="O que você vai doar?"
            placeholder="Ex.: Casacos infantis em ótimo estado"
          />
          <FormField
            control={form.control}
            name="description"
            label="Descrição"
            multiline
            placeholder="Conte detalhes úteis: tamanhos, medidas ou validade."
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <T variant="label">Categoria</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => (
              <Chip
                key={c}
                label={categoryLabels[c]}
                selected={form.watch('category') === c}
                onPress={() => form.setValue('category', c)}
              />
            ))}
          </View>
          <T variant="label">Condição</T>
          <View style={{ gap: 8 }}>
            {conditions.map((c) => (
              <Chip
                key={c}
                label={conditionLabels[c]}
                selected={form.watch('condition') === c}
                onPress={() => form.setValue('condition', c)}
              />
            ))}
          </View>
          <FormField
            control={form.control}
            name="quantity"
            numeric
            label="Quantidade de itens"
            keyboardType="number-pad"
          />
          <T muted>Este lote será reservado inteiro para uma instituição.</T>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <View style={[styles.card, { backgroundColor: colors.mint, borderWidth: 0 }]}>
            <T variant="label">Seu endereço fica protegido</T>
            <T variant="small" muted>
              Somente a instituição escolhida verá o endereço completo após a aceitação.
            </T>
          </View>
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
            Usar localização deste endereço
          </Button>
          <T variant="small" muted>
            Use essa opção quando estiver no endereço de retirada.
          </T>
          <FormField
            control={form.control}
            name="availability"
            label="Quando pode ser retirado?"
            placeholder="Ex.: Dias úteis, depois das 18h"
          />
          <FormField
            control={form.control}
            name="instructions"
            label="Orientações para retirada (opcional)"
            multiline
            placeholder="Ex.: Avisar na portaria ao chegar"
          />
          {!user.verified ? (
            <T style={{ color: colors.warning }}>
              Confirme seu email para publicar. Você pode salvar o rascunho enquanto isso.
            </T>
          ) : null}
        </>
      ) : null}
      {error ? (
        <T style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
      {step < 2 ? (
        <Button disabled={uploading || busy || !hydrated} onPress={() => void next()}>
          Continuar
        </Button>
      ) : (
        <Button
          busy={busy}
          disabled={uploading || !user.verified}
          onPress={() => void form.handleSubmit(() => save(true))()}
        >
          Publicar doação
        </Button>
      )}
      {step > 0 ? (
        <Button secondary disabled={busy || uploading} onPress={() => setStep(step - 1)}>
          Etapa anterior
        </Button>
      ) : null}
      <Button
        secondary
        busy={busy}
        disabled={uploading || !hydrated}
        onPress={() => void save(false)}
      >
        Salvar rascunho e sair
      </Button>
    </Screen>
  );
}
