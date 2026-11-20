import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { prepareGoogleSignIn, signInWithGoogle, type GoogleRequest } from '../lib/googleAuth';
import { PasswordField } from '../components/PasswordField';
import { GoogleButton } from '../components/GoogleButton';
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
  const [googleRequest, setGoogleRequest] = useState<GoogleRequest | null>(null);
  const [googleError, setGoogleError] = useState(false);
  const [googlePreparing, setGooglePreparing] = useState(true);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const [googleBuildRequired, setGoogleBuildRequired] = useState(false);

  useEffect(() => {
    let active = true;
    void prepareGoogleSignIn().then(request => { if (active) setGoogleRequest(request); }, cause => {
      if (active) {
        setGoogleError(true);
        setGoogleBuildRequired(cause instanceof Error && cause.message === 'google_development_build');
      }
    }).finally(() => { if (active) setGooglePreparing(false); });
    return () => { active = false; };
  }, [googleAttempt]);

  async function googleSignIn() {
    if (!googleRequest || busy) return;
    setBusy(true); setError(null); setNotice(false); setInvalid(false); setGoogleError(false);
    const request = googleRequest;
    setGoogleRequest(null);
    try {
      if (await signInWithGoogle(request)) { setPassword(''); router.replace('/'); }
    } catch { setGoogleError(true); }
    finally { setBusy(false); setGooglePreparing(true); setGoogleAttempt(value => value + 1); }
  }

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
    <GoogleButton label={googlePreparing ? t('wait') : t('googleSignIn')} disabled={busy || googlePreparing || googleBuildRequired}
      onPress={() => { if (googleRequest) void googleSignIn(); else { setGooglePreparing(true); setGoogleError(false); setGoogleAttempt(value => value + 1); } }} />
    <Notice message={googleBuildRequired ? t('googleBuildRequired') : googleError ? t('googleError') : ''} error />
    <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    <PasswordField key={register ? 'register' : 'login'} label={register ? t('passwordNew') : t('password')} value={password} onChangeText={setPassword} autoComplete={register ? 'new-password' : 'current-password'} editable={!busy} onSubmitEditing={() => { if (!busy) void submit(); }} />
    <Notice message={invalid ? t(register ? 'registerInvalid' : 'authInvalid') : error ? errorText(error, language) : ''} error /><Notice message={notice ? t('confirmEmail') : ''} />
    <Button label={busy ? t('wait') : register ? t('register') : t('login')} disabled={busy} onPress={() => void submit()} />
    <Button label={register ? t('backLogin') : t('toRegister')} secondary disabled={busy} onPress={() => { setRegister(!register); setError(null); setNotice(false); setInvalid(false); setPassword(''); }} />
    <Text style={ui.body}>{t('sessionHint')}</Text>
  </View>;
}
