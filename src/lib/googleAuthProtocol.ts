export function readGoogleCallback(value: string, redirectTo: string): string {
  const callback = new URL(value);
  const expected = new URL(redirectTo);
  if (callback.protocol !== expected.protocol || callback.host !== expected.host
    || callback.pathname !== expected.pathname || callback.hash
    || callback.searchParams.has('error') || callback.searchParams.getAll('code').length !== 1) {
    throw new Error('google_auth_failed');
  }
  const code = callback.searchParams.get('code');
  if (!code || code.length > 2048) throw new Error('google_auth_failed');
  return code;
}

export async function exchangeGoogleCode(
  baseUrl: string, publishableKey: string, code: string, verifier: string,
  request: typeof fetch = fetch,
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await request(`${baseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error('google_auth_failed');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('access_token' in data) || !('refresh_token' in data)
    || typeof data.access_token !== 'string' || !data.access_token
    || typeof data.refresh_token !== 'string' || !data.refresh_token) throw new Error('google_auth_failed');
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}
