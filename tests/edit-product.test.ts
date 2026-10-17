import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editProduct, type ProductEditStore } from '../src/lib/products/edit';
import type { Product } from '../src/lib/types';

const original: Product = { id: 'p1', name: 'Arroz', description: 'Un kilogramo', quantity: 10, price: 1.25, photo_path: 'existing.webp', is_archived: false, updated_at: '2026-10-16T12:00:00Z' };
const form = () => { const value = new FormData(); value.set('updated_at', original.updated_at); return value; };
function repository() {
  const uploads: string[] = [], removed: string[] = [];
  const updates: Partial<Product>[] = [];
  const store: ProductEditStore = {
    async upload(path) { uploads.push(path); return { error: null }; },
    async update(id, version, changes) {
      assert.equal(id, original.id); assert.equal(version, original.updated_at);
      updates.push(changes);
      return { data: { ...original, ...changes }, error: null };
    },
    async remove(path) { removed.push(path); },
  };
  return { store, uploads, removed, updates };
}

test('editar metadatos conserva la foto y excluye stock e identidad recibidos del formulario', async () => {
  const repo = repository(); const value = form();
  value.set('name', 'Arroz integral'); value.set('price', '2.50'); value.set('quantity', '999'); value.set('created_by', 'otro-usuario'); value.set('photo_path', 'otro-archivo.png');
  const result = await editProduct(original.id, value, repo.store);
  assert.equal(result.status, 200);
  assert.deepEqual(repo.updates[0], { name: 'Arroz integral', price: 2.5 });
  assert.equal((result.body as Product).photo_path, original.photo_path);
  assert.equal((result.body as Product).quantity, 10);
  assert.equal(repo.uploads.length, 0);
});

test('se puede añadir solo una foto después del alta sin cambiar los demás datos', async () => {
  const repo = repository(); const value = form();
  value.set('photo', new File(['photo'], 'photo.png', { type: 'image/png' }));
  const result = await editProduct(original.id, value, repo.store);
  assert.equal(result.status, 200);
  assert.equal(repo.uploads.length, 1);
  assert.equal((result.body as Product).photo_path, repo.uploads[0]);
  assert.deepEqual(Object.keys(repo.updates[0]), ['photo_path']);
  assert.equal((result.body as Product).name, original.name);
  assert.equal(repo.removed.length, 0);
});

test('un cambio concurrente no sobrescribe el producto y descarta solo la foto nueva', async () => {
  const repo = repository(); const value = form();
  value.set('photo', new File(['photo'], 'photo.webp', { type: 'image/webp' }));
  repo.store.update = async () => ({ data: null, error: null });
  const result = await editProduct(original.id, value, repo.store);
  assert.equal(result.status, 409);
  assert.deepEqual(repo.removed, repo.uploads);
  assert.ok(!repo.removed.includes(original.photo_path!));
});

test('una respuesta incierta conserva el archivo nuevo porque el servidor podría haber confirmado', async () => {
  const repo = repository(); const value = form();
  value.set('photo', new File(['photo'], 'photo.png', { type: 'image/png' }));
  repo.store.update = async () => ({ data: null, error: { code: '' } });
  assert.equal((await editProduct(original.id, value, repo.store)).status, 503);
  assert.equal(repo.removed.length, 0);
});

test('rechaza foto inválida, precio vacío y versión ausente antes de escribir', async () => {
  const repo = repository(); const value = form();
  value.set('photo', new File(['svg'], 'photo.svg', { type: 'image/svg+xml' }));
  assert.equal((await editProduct(original.id, value, repo.store)).status, 400);
  value.delete('photo'); value.set('price', '');
  assert.equal((await editProduct(original.id, value, repo.store)).status, 400);
  value.set('price', '2'); value.delete('updated_at');
  assert.equal((await editProduct(original.id, value, repo.store)).status, 400);
  assert.equal(repo.uploads.length, 0); assert.equal(repo.updates.length, 0);
});
