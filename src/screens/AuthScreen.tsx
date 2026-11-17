import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Notice, ui } from '../components/ui';
import { client } from '../lib/supabase';
import { errorText } from '../lib/models';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    setError(''); setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < (register ? 12 : 1)) {
      setError(register ? 'Bitte eine gültige E-Mail-Adresse und ein Passwort mit mindestens 12 Zeichen eingeben.' : 'Bitte E-Mail-Adresse und Passwort eingeben.');
      return;
    }
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const result = register ? await client().auth.signUp(credentials) : await client().auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      setPassword('');
      if (register && !result.data.session) setNotice('Bitte bestätige deine E-Mail-Adresse über den Link im Postfach. Danach kannst du dich hier anmelden.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  return <View style={[ui.card, { maxWidth: 480, width: '100%', alignSelf: 'center' }]}>
    <Text style={ui.eyebrow}>GEMEINSAM MEHR BEWEGEN</Text>
    <Text style={ui.heading}>{register ? 'Dein Konto anlegen' : 'Schön, dass du mithilfst.'}</Text>
    <Text style={ui.body}>Organisiere Aufgaben mit deinem Verein. Jeder Beitrag zählt.</Text>
    <Field label="E-Mail-Adresse" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    <Field label={register ? 'Passwort (mindestens 12 Zeichen)' : 'Passwort'} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} editable={!busy} onSubmitEditing={() => { if (!busy) void submit(); }} />
    <Notice message={error} error /><Notice message={notice} />
    <Button label={busy ? 'Einen Moment …' : register ? 'Konto erstellen' : 'Anmelden'} disabled={busy} onPress={() => void submit()} />
    <Button label={register ? 'Zur Anmeldung' : 'Noch kein Konto? Registrieren'} secondary disabled={busy} onPress={() => { setRegister(!register); setError(''); setNotice(''); setPassword(''); }} />
    <Text style={ui.body}>Du bleibst während dieser Sitzung angemeldet. Nach einem Neustart meldest du dich erneut an.</Text>
  </View>;
}
