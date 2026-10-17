import { NextResponse, type NextRequest } from 'next/server';
import { authorizedClient } from '@/lib/supabase/server';
import { hasAllowedOrigin } from '@/lib/request-origin';
import { editProduct } from '@/lib/products/edit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const auth = await authorizedClient();
  if (!auth) return NextResponse.json({ error: 'Inicia sesión para editar productos.' }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Producto inválido.' }, { status: 400 });
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Formulario inválido.' }, { status: 400 }); }
  const result = await editProduct(id, form, {
    async upload(path, file) {
      const { error } = await auth.client.storage.from('product-photos').upload(path, file, { contentType: file.type });
      return { error: error ? { code: 'statusCode' in error && String(error.statusCode) === '403' ? '42501' : undefined } : null };
    },
    async update(productId, version, changes) {
      const result = await auth.client.from('products').update(changes)
        .eq('id', productId).eq('updated_at', version).eq('is_archived', false)
        .select().maybeSingle();
      if (result.error) console.error('[products.update]', { code: result.error.code, message: result.error.message, hint: result.error.hint });
      return result;
    },
    async remove(path) { await auth.client.storage.from('product-photos').remove([path]); },
  });
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
