import assert from 'node:assert/strict';
import test from 'node:test';
import { exchangeGoogleCode, readGoogleCallback } from '../src/lib/googleAuthProtocol.ts';

test('Google-Callback akzeptiert nur den erwarteten Rückweg und genau einen Code', () => {
  const redirect = 'http://localhost:8081/auth/callback';
  assert.equal(readGoogleCallback(`${redirect}?code=test-code`, redirect), 'test-code');
  assert.equal(readGoogleCallback('ehrenamtsplaner://auth/callback?code=test-code', 'ehrenamtsplaner://auth/callback'), 'test-code');
  for (const url of [
    'https://other.example/auth/callback?code=test',
    'http://localhost:8082/auth/callback?code=test',
    'http://localhost:8081/other?code=test',
    `${redirect}?code=a&code=b`, `${redirect}?code=`, `${redirect}?error=access_denied`,
    `${redirect}?code=test&error=denied`, `${redirect}#access_token=unexpected`,
  ]) assert.throws(() => readGoogleCallback(url, redirect));
});

test('Google-Code wird mit PKCE-Prüfschlüssel getauscht; nur Sitzungstokens werden übernommen', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://project.example/auth/v1/token?grant_type=pkce');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(String(options?.body)), { auth_code: 'test-code', code_verifier: 'test-verifier' });
    assert.equal(new Headers(options?.headers).get('apikey'), 'public-test-key');
    return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', provider_token: 'ignored' });
  };
  assert.deepEqual(await exchangeGoogleCode('https://project.example', 'public-test-key', 'test-code', 'test-verifier', request),
    { access_token: 'test-access', refresh_token: 'test-refresh' });
});

test('Google-Codeaustausch behandelt Serverfehler und ungültige Antworten ohne interne Details', async () => {
  for (const response of [Response.json({ internal: 'private detail' }, { status: 400 }),
    Response.json(null), Response.json({ access_token: 42, refresh_token: 'test' }),
    Response.json({ access_token: 'test', refresh_token: '' })]) {
    const request: typeof fetch = async () => response;
    await assert.rejects(exchangeGoogleCode('https://project.example', 'public-test-key', 'test-code', 'test-verifier', request),
      { message: 'google_auth_failed' });
  }
});
