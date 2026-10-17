import { acknowledge, markConflict, operations, saveSnapshot } from './db';
import type { Deduction, Snapshot } from '../types';

export class SessionError extends Error {}
type Transport = (operation: Awaited<ReturnType<typeof operations>>[number]) => Promise<{ status: number; receipt?: Deduction; error?: string }>;

export async function drainQueue(userId: string, send: Transport) {
  for (const op of await operations(userId)) {
    if (op.status === 'conflict') continue;
    const result = await send(op); // Un fallo de red conserva el mismo ID para el reintento.
    if (result.status === 401 || result.status === 403) throw new SessionError('Tu sesión necesita renovarse. Los descuentos siguen guardados.');
    if (result.status === 409 || result.status === 400) {
      await markConflict(userId, op.id, result.error || 'Revisa este movimiento.');
    } else if (result.status === 200 && result.receipt) {
      await acknowledge(userId, op.id, result.receipt);
    } else {
      throw new Error('No hay conexión con el servidor. Tus descuentos siguen guardados.');
    }
  }
}

export async function syncInventory(userId: string) {
  const run = async () => {
    // Comprobar la cuenta antes de enviar una cola local evita enviarla con otra sesión.
    const before = await fetch('/api/bootstrap', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (before.status === 401) throw new SessionError('Inicia sesión de nuevo para sincronizar.');
    if (!before.ok) throw new Error('No se pudo actualizar el inventario.');
    const initial: Snapshot = await before.json();
    if (initial.identity.id !== userId) throw new SessionError('La sesión cambió. Entra con la cuenta que creó estos descuentos.');
    await saveSnapshot(initial);
    await drainQueue(userId, async op => {
      const response = await fetch('/api/deductions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op), signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return { status: response.status, receipt: response.ok ? data : undefined, error: data.error };
    });
    const after = await fetch('/api/bootstrap', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (after.status === 401) throw new SessionError('Inicia sesión de nuevo para sincronizar.');
    if (!after.ok) throw new Error('Descuentos enviados. Falta actualizar el catálogo.');
    const result: Snapshot = await after.json();
    if (result.identity.id !== userId) throw new SessionError('La sesión cambió.');
    await saveSnapshot(result);
  };
  // Exclusión entre pestañas. La base de datos también deduplica si no hay Web Locks.
  if (navigator.locks) await navigator.locks.request(`inventory-sync:${userId}`, run);
  else await run();
}
