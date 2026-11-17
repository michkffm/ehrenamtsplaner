import { useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ui } from '../components/ui';
import { AuthScreen } from '../screens/AuthScreen';
import { Dashboard } from '../screens/Dashboard';

export default function Home() {
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
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled"><View style={ui.container}>
        <Text style={ui.eyebrow}>EHRENAMTSPLANER / GEMEINSAM ANPACKEN</Text>
        {!supabase ? <View style={ui.card}><Text style={ui.title}>Ein guter Anfang für gute Taten.</Text>
          <Text style={ui.body}>Der Ehrenamtsplaner wird eingerichtet. Anmeldung und gemeinsame Aufgaben stehen bereit, sobald die Datenbank verbunden ist.</Text>
          <Text style={ui.body}>Es werden noch keine Daten übertragen. Bitte die Supabase-Einrichtung in der Projektanleitung abschließen.</Text>
        </View> : session ? <Dashboard key={session.user.id} userId={session.user.id} /> : <AuthScreen />}
        <Text style={ui.body}>Kleine Aufgaben. Große Wirkung.</Text>
      </View></ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
