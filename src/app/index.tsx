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
  const { ui, colors, t, dark } = useUI();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    void supabase.auth.getSession().then(({ data: current }) => setSession(current.session));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
    });
    return () => { data.subscription.unsubscribe(); subscription.remove(); };
  }, []);
  return <SafeAreaView style={ui.page}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled"><View style={ui.container}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          columnGap: 28, rowGap: 20, paddingBottom: 22, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ gap: 5, flexGrow: 1, flexBasis: 230 }}>
            <Text accessibilityRole="header" style={{ fontSize: 23, fontWeight: '800', color: colors.green, letterSpacing: -0.5 }}>{t('appName')}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{t('tagline')}</Text>
          </View>
          <PreferencesBar />
        </View>
        {!supabase ? <View style={ui.card}><Text style={ui.title}>{t('setupTitle')}</Text>
          <Text style={ui.body}>{t('setupText')}</Text>
          <Text style={ui.body}>{t('setupHint')}</Text>
        </View> : session ? <Dashboard key={session.user.id} userId={session.user.id} /> : <AuthScreen />}
      </View></ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
