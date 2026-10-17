import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function serverSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* El proxy actualiza cookies durante un render del servidor. */ }
      },
    } },
  );
}

export async function authorizedClient() {
  if (!isConfigured()) return null;
  const client = await serverSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await client.from('profiles').select('display_name,is_active').eq('id', user.id).single();
  if (!profile?.is_active) return null;
  return { client, user, profile };
}
