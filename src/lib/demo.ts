import type { Snapshot } from './types';
export const DEMO_ID = 'demo-local';
export const demoSnapshot: Snapshot = {
  identity: { id: DEMO_ID, name: 'Cuenta de demostración', email: 'Sin conexión a Supabase' },
  syncedAt: new Date('2026-10-16T16:00:00Z').toISOString(), history: [],
  products: [
    { id: 'demo-cafe', name: 'Café molido', description: 'Tueste medio · paquete de 250 g', quantity: 18, price: 4.5 },
    { id: 'demo-arroz', name: 'Arroz blanco', description: 'Grano largo · presentación de 1 kg', quantity: 32, price: 1.8 },
    { id: 'demo-aceite', name: 'Aceite vegetal', description: 'Botella de 1 litro', quantity: 4, price: 3.2 },
    { id: 'demo-harina', name: 'Harina de maíz', description: 'Presentación de 1 kg', quantity: 0, price: 1.5 },
  ].map(product => ({ ...product, photo_path: null, is_archived: false, updated_at: '2026-10-16T16:00:00Z' })),
};
