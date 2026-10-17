import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productSaveError } from '../src/lib/product-save-error';

test('el alta distingue permisos, datos inválidos y estructura desactualizada', () => {
  assert.equal(productSaveError('42501').status, 403);
  assert.match(productSaveError('42501').message, /permisos/);
  assert.equal(productSaveError('23502').status, 400);
  assert.match(productSaveError('23502').message, /NOT NULL/);
  assert.equal(productSaveError('23503').status, 409);
  assert.match(productSaveError('PGRST204').message, /migraciones/);
});

test('un fallo desconocido no afirma que la inserción se revirtió', () => {
  assert.equal(productSaveError(undefined).status, 503);
  assert.match(productSaveError(undefined).message, /Revisa el inventario antes de reintentar/);
});
