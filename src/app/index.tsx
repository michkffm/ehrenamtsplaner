import { useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useUI } from '../lib/preferences';
import { PreferencesBar } from '../components/PreferencesBar';
import { AuthScreen } from '../screens/AuthScreen';
import { Dashboard } from '../screens/Dashboard';

export default function Home() {
  const { ui, t, dark } = useUI();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
    });
    return () => { data.subscription.unsubscribe(); subscription.remove(); };
  }, []);
  return <SafeAreaView style={ui.page}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled"><View style={ui.container}>
        <Text style={ui.eyebrow}>{t('appName')} / {t('tagline')}</Text>
        <PreferencesBar />
        {!supabase ? <View style={ui.card}><Text style={ui.title}>{t('setupTitle')}</Text>
          <Text style={ui.body}>{t('setupText')}</Text>
          <Text style={ui.body}>{t('setupHint')}</Text>
        </View> : session ? <Dashboard key={session.user.id} userId={session.user.id} /> : <AuthScreen />}
        <Text style={ui.body}>{t('footer')}</Text>
      </View></ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
