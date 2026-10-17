import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, saveSnapshot, snapshot, operations, enqueue, available, resolveConflict, saveConfirmedProduct, readPhoto } from '../src/lib/offline/db';
import { drainQueue, SessionError } from '../src/lib/offline/sync';
import type { Deduction, Snapshot } from '../src/lib/types';

const initial: Snapshot = {
  identity: { id: 'alice', name: 'Alice', email: 'alice@example.test' },
  syncedAt: '2026-10-16T12:00:00Z', history: [],
  products: [{ id: 'product-1', name: 'Producto de prueba', description: '', photo_path: null, quantity: 5, price: 10, is_archived: false, updated_at: '2026-10-16T12:00:00Z' }],
};

beforeEach(async () => {
  const database = await db();
  for (const name of database.objectStoreNames) await database.clear(name);
  await saveSnapshot(structuredClone(initial));
});

test('la edición confirmada conserva los descuentos pendientes y guarda la foto para uso offline', async () => {
  await enqueue('alice', 'product-1', 2);
  const product = { ...initial.products[0], name: 'Producto editado', photo_path: 'new.png', updated_at: '2026-10-16T14:00:00Z' };
  await saveConfirmedProduct('alice', product, new Blob(['foto'], { type: 'image/png' }));
  assert.equal((await snapshot('alice'))?.products[0].name, 'Producto editado');
  assert.equal((await operations('alice')).length, 1);
  assert.equal(available(product.quantity, product.id, await operations('alice')), 3);
  assert.ok(await readPhoto('alice', 'new.png'));
  assert.equal(await readPhoto('bob', 'new.png'), undefined);
  await saveConfirmedProduct('alice', initial.products[0]);
  assert.equal((await snapshot('alice'))?.products[0].name, 'Producto editado');
});

test('la cola persiste y nunca reserva más unidades locales al usar dos pestañas', async () => {
  const result = await Promise.allSettled([enqueue('alice', 'product-1', 4), enqueue('alice', 'product-1', 4)]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await operations('alice')).length, 1);
  assert.equal(available(5, 'product-1', await operations('alice')), 1);
});

test('rechaza cantidades inválidas y productos que no existen en esta cuenta', async () => {
  for (const units of [0, -1, 1.5, NaN]) await assert.rejects(enqueue('alice', 'product-1', units));
  await assert.rejects(enqueue('bob', 'product-1', 1));
  assert.equal((await operations('alice')).length, 0);
});

test('una respuesta perdida conserva el mismo ID; reintentar registra una sola reducción', async () => {
  const operation = await enqueue('alice', 'product-1', 2);
  let serverStock = 5;
  let receipt: Deduction | undefined;
  const server = async () => {
    if (!receipt) {
      serverStock -= operation.units;
      receipt = { id: 'receipt-1', product_id: 'product-1', product_name: operation.productName, units: 2, quantity_before: 5, quantity_after: serverStock, performed_by: 'alice', created_at: '2026-10-16T13:00:00Z', client_operation_id: operation.id, occurred_at: operation.occurredAt };
    }
    return receipt;
  };
  await assert.rejects(drainQueue('alice', async () => { await server(); throw new Error('Red interrumpida'); }));
  assert.equal((await operations('alice'))[0].id, operation.id);
  await drainQueue('alice', async op => { assert.equal(op.id, operation.id); return { status: 200, receipt: await server() }; });
  assert.equal(serverStock, 3);
  assert.equal((await operations('alice')).length, 0);
  assert.equal((await snapshot('alice'))?.products[0].quantity, 3);
  assert.equal((await snapshot('alice'))?.history.length, 1);
});

test('un conflicto conserva el movimiento, permite revisarlo y no bloquea otros productos', async () => {
  const op = await enqueue('alice', 'product-1', 1);
  await drainQueue('alice', async () => ({ status: 409, error: 'Stock insuficiente' }));
  assert.equal((await operations('alice'))[0].status, 'conflict');
  assert.equal(available(5, 'product-1', await operations('alice')), 5);
  await resolveConflict('bob', op.id, false);
  assert.equal((await operations('alice')).length, 1);
  await resolveConflict('alice', op.id, false);
  assert.equal((await operations('alice')).length, 0);
});

test('sesión expirada y errores transitorios mantienen la cola; otra cuenta no la envía', async () => {
  await enqueue('alice', 'product-1', 1);
  await assert.rejects(drainQueue('alice', async () => ({ status: 401 })), SessionError);
  await assert.rejects(drainQueue('alice', async () => ({ status: 503 })));
  let sent = 0;
  await drainQueue('bob', async () => { sent++; return { status: 200 }; });
  assert.equal(sent, 0);
  assert.equal((await operations('alice')).length, 1);
});

test('descargar un recibo confirmado reconcilia una respuesta perdida sin descontar dos veces en la vista', async () => {
  const op = await enqueue('alice', 'product-1', 2);
  const next = structuredClone(initial);
  next.products[0].quantity = 3;
  next.history = [{ id: 'r', product_id: 'product-1', product_name: op.productName, units: 2, quantity_before: 5, quantity_after: 3, performed_by: 'alice', created_at: '2026-10-16T13:00:00Z', client_operation_id: op.id, occurred_at: op.occurredAt }];
  await saveSnapshot(next);
  assert.equal((await operations('alice')).length, 0);
  assert.equal((await snapshot('alice'))?.products[0].quantity, 3);
});
