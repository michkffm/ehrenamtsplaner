import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { client } from './supabase';
import { exchangeGoogleCode, readGoogleCallback } from './googleAuthProtocol';

export type GoogleRequest = { url: string; redirectTo: string; verifier: string };

export async function prepareGoogleSignIn(): Promise<GoogleRequest> {
  if (Platform.OS !== 'web' && Constants.executionEnvironment === 'storeClient') {
    throw new Error('google_development_build');
  }
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('missing_configuration');
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : 'ehrenamtsplaner://auth/callback';
  const verifier = Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const query = new URLSearchParams({ provider: 'google', redirect_to: redirectTo,
    code_challenge: challenge, code_challenge_method: 's256', prompt: 'select_account' });
  return { url: `${baseUrl}/auth/v1/authorize?${query}`, redirectTo, verifier };
}

export async function signInWithGoogle(request: GoogleRequest): Promise<boolean> {
  // Open synchronously from the click: mobile browsers otherwise block the popup.
  const result = await WebBrowser.openAuthSessionAsync(request.url, request.redirectTo);
  if (result.type !== 'success') return false;
  const code = readGoogleCallback(result.url, request.redirectTo);
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !key) throw new Error('missing_configuration');
  // Explicit S256 avoids auth-js falling back to plain PKCE on native runtimes without WebCrypto.
  const tokens = await exchangeGoogleCode(baseUrl, key, code, request.verifier);
  const { error } = await client().auth.setSession(tokens);
  if (error) throw new Error('google_auth_failed');
  return true;
}
