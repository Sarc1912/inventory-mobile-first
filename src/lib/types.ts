export type Product = {
  id: string; name: string; description: string; photo_path: string | null;
  quantity: number; price: number; is_archived: boolean; updated_at: string;
};
export type Deduction = {
  id: string; product_id: string; product_name: string; units: number;
  quantity_before: number; quantity_after: number; performed_by: string | null;
  created_at: string; client_operation_id: string | null; occurred_at: string;
};
export type Operation = {
  id: string; userId: string; productId: string; productName: string; units: number;
  occurredAt: string; status: 'pending' | 'conflict'; error?: string;
};
export type Identity = { id: string; name: string; email: string };
export type Snapshot = {
  products: Product[]; history: Deduction[]; identity: Identity; syncedAt: string;
};
