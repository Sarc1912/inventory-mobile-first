import { authorizedClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAllowedOrigin } from '@/lib/request-origin';

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const auth = await authorizedClient();
  if (!auth) return NextResponse.json({ error: 'Vuelve a iniciar sesión para sincronizar.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  if (body.userId !== auth.user.id) return NextResponse.json({ error: 'La sesión cambió. Entra con la cuenta de este movimiento.' }, { status: 401 });
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(body.id) || !uuid.test(body.productId) || !Number.isSafeInteger(body.units) || body.units < 1 || body.units > 2147483647 || !Number.isFinite(Date.parse(body.occurredAt))) {
    return NextResponse.json({ error: 'Revisa el producto y la cantidad.' }, { status: 400 });
  }
  const { data, error } = await auth.client.rpc('sync_deduction', {
    p_operation_id: body.id, p_product_id: body.productId, p_units: body.units, p_occurred_at: body.occurredAt,
  });
  if (error) {
    const status = error.code === '22023' ? 409 : error.code === '42501' ? 401 : 503;
    return NextResponse.json({ error: status === 409 ? 'El producto ya no está disponible o no tiene existencias suficientes.' : status === 401 ? 'Vuelve a iniciar sesión para sincronizar.' : 'No se pudo sincronizar. El descuento sigue guardado.' }, { status });
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
