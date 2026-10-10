import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema, type AuthResult } from '@entrega/contracts';
import { request, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, FormField, Icon, Screen, T, colors, styles } from '../components/ui';
const schema = registerSchema.extend({ name: z.string().max(100) });
export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [visible, setVisible] = useState(false);
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });
  async function submit() {
    setError('');
    try {
      if (mode === 'forgot') {
        if (!(await form.trigger('email'))) return;
        await request('/auth/forgot', { method: 'POST', body: { email: form.getValues('email') } });
        setSent(true);
        return;
      }
      if (mode === 'register' && !form.getValues('name').trim()) {
        form.setError('name', { message: 'Informe seu nome' });
        return;
      }
      if (!(await form.trigger(mode === 'login' ? ['email', 'password'] : undefined))) return;
      const result = await request<AuthResult>(`/auth/${mode}`, {
        method: 'POST',
        body: form.getValues(),
      });
      await signIn(result);
      router.replace('/');
    } catch (err) {
      setError(errorText(err));
    }
  }
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await submit();
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setError('');
    setSent(false);
    form.clearErrors();
  }
  return (
    <Screen back title="Entrega Doações">
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          backgroundColor: colors.mint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="heart" size={32} />
      </View>
      <View style={{ gap: 10 }}>
        <T variant="hero">
          {mode === 'register'
            ? 'Vamos fazer essa conexão?'
            : mode === 'forgot'
              ? 'Vamos recuperar seu acesso.'
              : 'Que bom ver você aqui.'}
        </T>
        <T muted>
          {mode === 'register'
            ? 'Crie sua conta para doar ou representar uma instituição.'
            : mode === 'forgot'
              ? 'Enviaremos um link para você escolher uma nova senha.'
              : 'Entre para acompanhar suas doações e conversas.'}
        </T>
      </View>
      <View style={styles.stack}>
        {mode === 'register' ? (
          <FormField
            control={form.control}
            name="name"
            label="Seu nome"
            autoComplete="name"
            textContentType="name"
          />
        ) : null}
        <FormField
          control={form.control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        {mode !== 'forgot' ? (
          <>
            <FormField
              control={form.control}
              name="password"
              label="Senha"
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              helper="Use pelo menos 10 caracteres."
            />
            <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)}>
              <T variant="small" style={{ color: colors.green }}>
                {visible ? 'Ocultar senha' : 'Mostrar senha'}
              </T>
            </Pressable>
          </>
        ) : null}
      </View>
      {error ? (
        <T style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
      {sent ? (
        <T style={{ color: colors.green }}>
          Se este email estiver cadastrado, você receberá o link de recuperação.
        </T>
      ) : null}
      <Button busy={busy} onPress={() => void send()}>
        {mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar link' : 'Entrar'}
      </Button>
      {mode === 'login' ? (
        <>
          <Button secondary onPress={() => switchMode('register')}>
            Criar uma conta
          </Button>
          <Pressable
            accessibilityRole="button"
            onPress={() => switchMode('forgot')}
            style={{ alignItems: 'center', padding: 12 }}
          >
            <T variant="label" style={{ color: colors.green }}>
              Esqueci minha senha
            </T>
          </Pressable>
        </>
      ) : (
        <Button secondary onPress={() => switchMode('login')}>
          Já tenho conta
        </Button>
      )}
    </Screen>
  );
}
