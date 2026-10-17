import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAllowedOrigin } from '../src/lib/request-origin';

const check = (headers: Record<string, string>, canonical = '') => hasAllowedOrigin(
  new Request('http://0.0.0.0:3000/api/products', { method: 'POST', headers }), canonical,
);

test('acepta localhost e IP del teléfono aunque Next use 0.0.0.0 internamente', () => {
  for (const host of ['localhost:3000', '127.0.0.1:3000', '192.168.1.20:3000', '[::1]:3000']) {
    assert.equal(check({ host, origin: `http://${host}` }), true);
  }
});

test('bloquea otro dominio, puerto o protocolo y Origin ausente o inválido', () => {
  for (const origin of ['http://evil.test', 'http://localhost:3001', 'https://localhost:3000', 'null', 'invalid', 'http://localhost:3000/path', 'http://user@localhost:3000']) {
    assert.equal(check({ host: 'localhost:3000', origin }), false, origin);
  }
  assert.equal(check({ host: 'localhost:3000' }), false);
  assert.equal(check({ origin: 'http://localhost:3000' }), false);
});

test('acepta HTTPS detrás del proxy y normaliza puertos por defecto', () => {
  assert.equal(check({ host: 'inventory.example', origin: 'https://inventory.example', 'x-forwarded-proto': 'https' }), true);
  assert.equal(check({ host: 'LOCALHOST:80', origin: 'http://localhost' }), true);
});

test('la URL pública configurada permite Host reescrito y no admite orígenes adicionales', () => {
  const headers = { host: 'internal:3000', origin: 'https://inventory.example' };
  assert.equal(check(headers, 'https://inventory.example'), true);
  assert.equal(check({ ...headers, origin: 'http://internal:3000' }, 'https://inventory.example'), false);
  assert.equal(check(headers, 'https://inventory.example/path'), false);
  assert.equal(check({ host: 'localhost:3000', origin: 'https://evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'https' }), false);
});
