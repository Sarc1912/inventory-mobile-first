'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Upload, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { ProductPhoto } from './product-photo';

export function ProductEditor({ product, userId, online, demo, onCancel, onSaved }: {
  product: Product; userId: string; online: boolean; demo: boolean;
  onCancel: () => void; onSaved: (product: Product, photo?: Blob) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (!online || !navigator.onLine) { setError('Conecta a internet para guardar la edición y subir la foto.'); return; }
    const form = new FormData(event.currentTarget);
    form.set('updated_at', product.updated_at);
    if (photo) form.set('photo', photo); else form.delete('photo');
    setBusy(true);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'PATCH', body: form, signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar la edición.');
      await onSaved(result, photo || undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo confirmar la edición. Revisa el inventario antes de reintentar.'); }
    finally { setBusy(false); }
  };
  return <section>
    <button className="back-button" disabled={busy} onClick={onCancel}><ArrowLeft size={18} />Volver al inventario</button>
    <div className="page-title"><div><h1>Editar producto</h1><p className="muted">Añade una foto o actualiza sus datos.</p></div></div>
    <form className="editor form-stack" onSubmit={save}>
      <div className="edit-photo-preview">{preview ? <img src={preview} alt="Vista previa de la nueva foto" /> : <ProductPhoto userId={userId} path={product.photo_path} name={product.name} />}<div><strong>Foto del producto</strong><p className="muted">{photo ? photo.name : product.photo_path ? 'Puedes elegir otra foto para reemplazarla.' : 'Puedes añadirla ahora o más adelante.'}</p></div></div>
      <label className="upload-label"><Upload size={20} />{product.photo_path ? 'Reemplazar foto' : 'Añadir foto'}
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
          const file = event.currentTarget.files?.[0] || null;
          if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
            setError('Usa una foto JPG, PNG o WebP de hasta 5 MB.'); event.currentTarget.value = ''; setPhoto(null); return;
          }
          setError(''); setPhoto(file);
        }} />
        <small>Opcional · JPG, PNG o WebP · hasta 5 MB. Si no eliges otra foto, se conserva la actual.</small>
      </label>
      {photo && <button type="button" className="text-button clear-photo" disabled={busy} onClick={event => { setPhoto(null); const input = event.currentTarget.form?.elements.namedItem('photo'); if (input instanceof HTMLInputElement) input.value = ''; }}><X size={16} />Quitar selección</button>}
      <label>Nombre<input name="name" defaultValue={product.name} maxLength={200} required disabled={busy} /></label>
      <label>Descripción<textarea name="description" defaultValue={product.description} rows={3} maxLength={5000} disabled={busy} /></label>
      <label>Precio<input name="price" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={product.price} required disabled={busy} /></label>
      <p className="muted">La edición y la subida de fotos necesitan conexión. Las cantidades se actualizan mediante los descuentos.</p>
      {error && <p role="alert" className="error-text">{error}</p>}
      {demo && <p className="notice">Vista de demostración. Guardar cambios necesita una cuenta conectada a Supabase.</p>}
      <button className="button primary" disabled={busy || !online || demo}>{busy ? 'Guardando…' : 'Guardar cambios'}<Check size={18} /></button>
    </form>
  </section>;
}
