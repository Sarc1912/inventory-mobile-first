import { redirect } from 'next/navigation';
import { authorizedClient, isConfigured } from '@/lib/supabase/server';
import { InventoryApp } from '@/components/inventory-app';
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  if (!isConfigured()) redirect('/login');
  const auth = await authorizedClient();
  if (!auth) redirect('/login');
  return <InventoryApp serverIdentity={{ id: auth.user.id, name: auth.profile.display_name || 'Mi cuenta', email: auth.user.email || '' }} />;
}
