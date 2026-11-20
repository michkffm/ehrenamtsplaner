import { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useUI } from '../../lib/preferences';

export default function AuthCallback() {
  const { ui, t } = useUI();
  const completed = useRef(false);
  useEffect(() => {
    if (Platform.OS === 'web' && !completed.current) {
      completed.current = true;
      try {
        WebBrowser.maybeCompleteAuthSession();
      } catch {
        // The original window is unavailable: restart from the normal sign-in screen.
        router.replace('/');
      } finally {
        // The parent receives the code; never leave it in the visible URL/history.
        window.history.replaceState(null, '', '/auth/callback');
      }
    }
  }, []);
  return <View style={ui.page}><View style={ui.container}><View style={ui.card}>
    <Text style={ui.title}>{t('googleReturn')}</Text>
    <Text style={ui.body}>{t('googleReturnHint')}</Text>
    <Link href="/" style={ui.body}>{t('backLogin')}</Link>
  </View></View></View>;
}
