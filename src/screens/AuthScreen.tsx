import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Notice } from '../components/ui';
import { client } from '../lib/supabase';
import { useUI } from '../lib/preferences';
import { errorText } from '../lib/models';

export function AuthScreen() {
  const { ui, t, language } = useUI();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [invalid, setInvalid] = useState(false);
  const [notice, setNotice] = useState(false);

  async function submit() {
    setError(null); setNotice(false); setInvalid(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < (register ? 12 : 1)) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const result = register ? await client().auth.signUp(credentials) : await client().auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      setPassword('');
      if (register && !result.data.session) setNotice(true);
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }

  return <View style={[ui.card, { maxWidth: 480, width: '100%', alignSelf: 'center' }]}>
    <Text style={ui.eyebrow}>{t('authEyebrow')}</Text>
    <Text style={ui.heading}>{register ? t('registerTitle') : t('loginTitle')}</Text>
    <Text style={ui.body}>{t('authIntro')}</Text>
    <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    <Field label={register ? t('passwordNew') : t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} editable={!busy} onSubmitEditing={() => { if (!busy) void submit(); }} />
    <Notice message={invalid ? t(register ? 'registerInvalid' : 'authInvalid') : error ? errorText(error, language) : ''} error /><Notice message={notice ? t('confirmEmail') : ''} />
    <Button label={busy ? t('wait') : register ? t('register') : t('login')} disabled={busy} onPress={() => void submit()} />
    <Button label={register ? t('backLogin') : t('toRegister')} secondary disabled={busy} onPress={() => { setRegister(!register); setError(null); setNotice(false); setInvalid(false); setPassword(''); }} />
    <Text style={ui.body}>{t('sessionHint')}</Text>
  </View>;
}
