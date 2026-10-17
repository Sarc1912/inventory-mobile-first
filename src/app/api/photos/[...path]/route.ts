import { authorizedClient } from '@/lib/supabase/server';
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await authorizedClient();
  if (!auth) return new Response(null, { status: 401 });
  const { path } = await params;
  const { data, error } = await auth.client.storage.from('product-photos').download(path.join('/'));
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, { headers: { 'Content-Type': data.type, 'Cache-Control': 'private, no-store' } });
}
