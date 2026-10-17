import { authorizedClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAllowedOrigin } from '@/lib/request-origin';
import { productSaveError } from '@/lib/product-save-error';

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const auth = await authorizedClient();
  if (!auth) return NextResponse.json({ error: 'Inicia sesión para añadir productos.' }, { status: 401 });
  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const description = String(form.get('description') || '').trim();
  const quantity = Number(form.get('quantity'));
  const price = Number(form.get('price'));
  if (!name || name.length > 200 || description.length > 5000 || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647 || !Number.isFinite(price) || price < 0 || price >= 1e10 || Math.abs(price * 100 - Math.round(price * 100)) > .00001) {
    return NextResponse.json({ error: 'Revisa nombre, cantidad y precio (máximo dos decimales).' }, { status: 400 });
  }
  let photo_path: string | null = null;
  const photo = form.get('photo');
  if (photo instanceof File && photo.size) {
    if (photo.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return NextResponse.json({ error: 'Usa una foto JPG, PNG o WebP de hasta 5 MB.' }, { status: 400 });
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[photo.type];
    photo_path = `${crypto.randomUUID()}.${extension}`;
    const { error } = await auth.client.storage.from('product-photos').upload(photo_path, photo, { contentType: photo.type });
    if (error) return NextResponse.json({ error: 'No se pudo subir la foto.' }, { status: 503 });
  }
  const { data, error } = await auth.client.from('products').insert({ name, description, quantity, price, photo_path }).select().single();
  if (error) {
    // No registrar credenciales, el formulario ni `details` (puede contener la fila).
    console.error('[products.create]', { code: error.code, message: error.message, hint: error.hint });
    const failure = productSaveError(error.code);
    // Una respuesta incierta puede haber confirmado la inserción: conservar su foto.
    if (photo_path && ['42501', '23502', '23503', '23514', '23505', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(error.code)) {
      await auth.client.storage.from('product-photos').remove([photo_path]).catch(() => {});
    }
    return NextResponse.json({ error: failure.message, code: error.code || null }, { status: failure.status });
  }
  return NextResponse.json(data, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
