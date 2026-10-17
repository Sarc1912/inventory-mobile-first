import type { Product } from '../types';
import { productSaveError } from '../product-save-error';

type Changes = Partial<Pick<Product, 'name' | 'description' | 'price' | 'photo_path'>>;
type StoreError = { code?: string };
export interface ProductEditStore {
  upload(path: string, photo: File): Promise<{ error: StoreError | null }>;
  update(id: string, version: string, changes: Changes): Promise<{ data: Product | null; error: StoreError | null }>;
  remove(path: string): Promise<void>;
}
const definiteFailures = ['42501', '23502', '23503', '23514', '23505', 'PGRST204', 'PGRST205', '42703', '42P01'];

export async function editProduct(id: string, form: FormData, store: ProductEditStore) {
  const failure = (error: string, status = 400, code?: string) => ({ status, body: { error, ...(code ? { code } : {}) } });
  const version = form.get('updated_at');
  if (typeof version !== 'string' || !Number.isFinite(Date.parse(version))) {
    return failure('Actualiza el inventario y vuelve a abrir el producto antes de editarlo.');
  }
  const changes: Changes = {};
  if (form.has('name')) {
    const name = form.get('name');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) return failure('Indica un nombre de hasta 200 caracteres.');
    changes.name = name.trim();
  }
  if (form.has('description')) {
    const description = form.get('description');
    if (typeof description !== 'string' || description.trim().length > 5000) return failure('La descripción admite hasta 5000 caracteres.');
    changes.description = description.trim();
  }
  if (form.has('price')) {
    const raw = form.get('price');
    const price = typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(price) || price < 0 || price >= 1e10 || Math.abs(price * 100 - Math.round(price * 100)) > .00001) return failure('Indica un precio válido con un máximo de dos decimales.');
    changes.price = price;
  }
  const photo = form.get('photo');
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
    return failure('Usa una foto JPG, PNG o WebP de hasta 5 MB.');
  }
  if (!file && Object.keys(changes).length === 0) return failure('No hay cambios para guardar.');

  let uploadedPath: string | null = null;
  if (file) {
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type];
    uploadedPath = `${crypto.randomUUID()}.${extension}`;
    const { error } = await store.upload(uploadedPath, file);
    if (error) return failure('No se pudo subir la foto. Tus cambios siguen en el formulario.', error.code === '42501' ? 403 : 503);
    changes.photo_path = uploadedPath;
  }
  const { data, error } = await store.update(id, version, changes);
  if (error || !data) {
    // Con un fallo de red no sabemos si la actualización se confirmó.
    // Solo se descarta el archivo nuevo ante un rechazo definitivo.
    if (uploadedPath && (!error || definiteFailures.includes(error.code || ''))) {
      await store.remove(uploadedPath).catch(() => {});
    }
    if (!error) return failure('El producto cambió o ya no está disponible. Vuelve al inventario, sincroniza y abre de nuevo la edición.', 409);
    if (error.code === '42501') return failure('Supabase rechazó la edición. Revisa UPDATE de products y la política products_update. Código: 42501.', 403, error.code);
    const result = productSaveError(error.code);
    return failure(result.message, result.status, error.code);
  }
  // La foto anterior se conserva: otros dispositivos pueden seguir usando su ruta
  // desde un catálogo descargado. La nueva usa una ruta distinta para renovar la caché.
  return { status: 200, body: data };
}
