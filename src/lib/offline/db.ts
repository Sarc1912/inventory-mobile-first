import { openDB, type DBSchema } from 'idb';
import type { Snapshot, Operation, Deduction, Identity, Product } from '../types';

interface InventoryDB extends DBSchema {
  snapshots: { key: string; value: Snapshot };
  operations: { key: string; value: Operation; indexes: { userId: string } };
  photos: { key: string; value: { key: string; userId: string; blob: Blob } };
  meta: { key: string; value: Identity };
}

export const db = () => openDB<InventoryDB>('inventory-offline-v1', 1, {
  upgrade(database) {
    database.createObjectStore('snapshots');
    database.createObjectStore('meta');
    const operations = database.createObjectStore('operations', { keyPath: 'id' });
    operations.createIndex('userId', 'userId');
    database.createObjectStore('photos', { keyPath: 'key' });
  },
});

export async function localIdentity() { return (await db()).get('meta', 'activeUser'); }
export async function setIdentity(identity: Identity) { await (await db()).put('meta', identity, 'activeUser'); }
export async function clearIdentity() { await (await db()).delete('meta', 'activeUser'); }
export async function snapshot(userId: string) { return (await db()).get('snapshots', userId); }
export async function operations(userId: string) {
  return (await (await db()).getAllFromIndex('operations', 'userId', userId)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}
export async function saveSnapshot(value: Snapshot) {
  const database = await db();
  const tx = database.transaction(['snapshots', 'operations', 'meta'], 'readwrite');
  const acknowledged = new Set(value.history.map(h => h.client_operation_id));
  const queued = await tx.objectStore('operations').index('userId').getAll(value.identity.id);
  for (const op of queued) if (acknowledged.has(op.id)) await tx.objectStore('operations').delete(op.id);
  await tx.objectStore('snapshots').put(value, value.identity.id);
  await tx.objectStore('meta').put(value.identity, 'activeUser');
  await tx.done;
}

export function available(quantity: number, productId: string, queue: Operation[]) {
  return quantity - queue.filter(o => o.productId === productId && o.status === 'pending').reduce((n, o) => n + o.units, 0);
}

export async function enqueue(userId: string, productId: string, units: number) {
  if (!Number.isSafeInteger(units) || units <= 0) throw new Error('Indica una cantidad entera mayor que cero.');
  const database = await db();
  // Una única transacción impide sobreventa local al usar varias pestañas.
  const tx = database.transaction(['snapshots', 'operations'], 'readwrite');
  const value = await tx.objectStore('snapshots').get(userId);
  const product = value?.products.find(p => p.id === productId && !p.is_archived);
  const queued = await tx.objectStore('operations').index('userId').getAll(userId);
  if (!product || available(product.quantity, productId, queued) < units) {
    await tx.done;
    throw new Error('No hay suficientes existencias en este teléfono.');
  }
  const operation: Operation = {
    id: crypto.randomUUID(), userId, productId, productName: product.name, units,
    occurredAt: new Date().toISOString(), status: 'pending',
  };
  await tx.objectStore('operations').add(operation);
  await tx.done;
  return operation;
}

export async function acknowledge(userId: string, operationId: string, receipt: Deduction) {
  const database = await db();
  const tx = database.transaction(['snapshots', 'operations'], 'readwrite');
  const op = await tx.objectStore('operations').get(operationId);
  if (op?.userId !== userId || receipt.client_operation_id !== operationId) throw new Error('Respuesta de sincronización inválida.');
  const value = await tx.objectStore('snapshots').get(userId);
  if (value) {
    value.history = [receipt, ...value.history.filter(h => h.id !== receipt.id)].slice(0, 500);
    value.products = value.products.map(p => p.id === receipt.product_id && p.updated_at <= receipt.created_at
      ? { ...p, quantity: receipt.quantity_after, updated_at: receipt.created_at } : p);
    await tx.objectStore('snapshots').put(value, userId);
  }
  await tx.objectStore('operations').delete(operationId);
  await tx.done;
}

export async function markConflict(userId: string, id: string, error: string) {
  const database = await db();
  const tx = database.transaction('operations', 'readwrite');
  const op = await tx.store.get(id);
  if (op?.userId === userId) await tx.store.put({ ...op, status: 'conflict', error });
  await tx.done;
}
export async function resolveConflict(userId: string, id: string, retry: boolean) {
  const database = await db();
  const tx = database.transaction('operations', 'readwrite');
  const op = await tx.store.get(id);
  if (op?.userId === userId && op.status === 'conflict') {
    if (retry) await tx.store.put({ ...op, status: 'pending', error: undefined });
    else await tx.store.delete(id);
  }
  await tx.done;
}
export async function savePhoto(userId: string, path: string, blob: Blob) {
  await (await db()).put('photos', { key: `${userId}:${path}`, userId, blob });
}
export async function readPhoto(userId: string, path: string) {
  return (await (await db()).get('photos', `${userId}:${path}`))?.blob;
}

export async function saveConfirmedProduct(userId: string, product: Product, photo?: Blob) {
  const database = await db();
  const tx = database.transaction(['snapshots', 'photos'], 'readwrite');
  const value = await tx.objectStore('snapshots').get(userId);
  if (value) {
    const existing = value.products.find(p => p.id === product.id);
    if (!existing || Date.parse(existing.updated_at) <= Date.parse(product.updated_at)) {
      value.products = [...value.products.filter(p => p.id !== product.id), product];
      await tx.objectStore('snapshots').put(value, userId);
    }
  }
  if (photo && product.photo_path) {
    const key = `${userId}:${product.photo_path}`;
    await tx.objectStore('photos').put({ key, userId, blob: photo });
  }
  await tx.done;
}
