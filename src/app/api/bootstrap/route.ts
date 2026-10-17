import { authorizedClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export async function GET() {
  const auth = await authorizedClient();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!auth) return NextResponse.json({ error: 'Inicia sesión con una cuenta autorizada.' }, { status: 401, headers });
  const products: unknown[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await auth.client.from('products').select('*').order('id').range(page * 500, page * 500 + 499);
    if (error) return NextResponse.json({ error: 'No se pudo descargar el inventario.' }, { status: 503, headers });
    products.push(...data);
    if (data.length < 500) break;
  }
  const { data: history, error } = await auth.client.from('stock_deductions').select('*').order('created_at', { ascending: false }).order('id').limit(500);
  if (error) return NextResponse.json({ error: 'No se pudo descargar el historial.' }, { status: 503, headers });
  return NextResponse.json({
    products, history,
    identity: { id: auth.user.id, name: auth.profile.display_name || 'Mi cuenta', email: auth.user.email || '' },
    syncedAt: new Date().toISOString(),
  }, { headers });
}
