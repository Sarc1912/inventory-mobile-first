'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowRight, Box, Check, CheckCheck, ChevronRight, Clock3, CloudOff, History, LogOut, Minus, PackageOpen, Plus, RefreshCw, Search, Upload, Wifi, WifiOff, X } from 'lucide-react';
import type { Identity, Product } from '@/lib/types';
import { useInventory } from '@/lib/offline/use-inventory';
import { available } from '@/lib/offline/db';
import { browserSupabase } from '@/lib/supabase/browser';
import { ProductPhoto } from './product-photo';
import { ProductEditor } from './product-editor';
import { Pencil } from 'lucide-react';

type Tab = 'inventory' | 'history' | 'queue';
const date = (value: string) => new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const price = (value: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function InventoryApp({ serverIdentity, demo = false }: { serverIdentity?: Identity; demo?: boolean }) {
  const inventory = useInventory(serverIdentity, demo);
  const { identity, data, queue, ready, online, syncing, error, sessionExpired, offlineReady } = inventory;
  const [tab, setTab] = useState<Tab>('inventory');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [units, setUnits] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [account, setAccount] = useState(false);
  const pending = queue.filter(op => op.status === 'pending');
  const conflicts = queue.filter(op => op.status === 'conflict');
  const products = useMemo(() => {
    const term = query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (data?.products || []).filter(p => !p.is_archived && available(p.quantity, p.id, queue) > 0)
      .filter(p => `${p.name} ${p.description}`.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [data, query, queue]);
  const changeTab = (next: Tab) => { setTab(next); setSelected(null); setAdding(false); setEditing(null); setFormError(''); setToast(''); };
  const deduct = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setFormError('');
    try { await inventory.deduct(selected.id, units); setSelected(null); setToast('Descuento guardado en este teléfono. Puedes seguir trabajando.'); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar. No cierres esta pantalla e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      const response = await fetch('/api/products', { method: 'POST', body: new FormData(event.currentTarget), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await inventory.synchronize(); setAdding(false); setToast('Producto guardado.');
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar. Revisa el catálogo antes de reintentar.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    if (demo) { await inventory.closeLocalSession(); window.location.assign('/login'); return; }
    if (!online || syncing) { setToast('Espera a tener conexión y a que termine la sincronización para cerrar sesión.'); return; }
    setBusy(true);
    try {
      const { error } = await browserSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      await inventory.closeLocalSession(); window.location.assign('/login');
    } catch { setToast('No se pudo cerrar sesión. Inténtalo cuando la conexión sea estable.'); }
    finally { setBusy(false); }
  };

  if (!ready) return <main className="center-state" aria-busy="true"><Box size={36} /><h1>Abriendo inventario</h1><p>Preparando la copia de este teléfono…</p></main>;
  if (!identity) return <main className="center-state"><CloudOff size={40} /><h1>Primero, entra con conexión</h1><p>{error || 'Este teléfono todavía no tiene una copia del inventario de tu cuenta.'}</p><a className="button primary" href="/login">Ir al inicio de sesión<ArrowRight size={18} /></a></main>;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    {demo && <div className="demo-banner">Demostración local · productos de ejemplo · no se envían datos a Supabase</div>}
    <header className="app-header"><div className="header-inner"><a className="brand" href={demo ? '/demo' : '/inventario'}><Box aria-hidden="true" /><span>Inventario</span></a><button className="account-button" onClick={() => setAccount(!account)} aria-expanded={account} aria-label="Abrir mi cuenta">{identity.name.slice(0, 1).toUpperCase()}</button></div>
      {account && <div className="account-panel"><strong>{identity.name}</strong><span>{identity.email}</span><p>Los pendientes se conservan en este teléfono al salir. Solo esta cuenta podrá enviarlos.</p><button className="button secondary" onClick={signOut} disabled={busy || syncing || (!online && !demo)}><LogOut size={18} />Cerrar sesión</button><button className="text-button" onClick={() => setAccount(false)}>Cerrar panel</button></div>}
    </header>
    <div className={`connection-strip ${!online || demo ? 'offline' : ''}`} role="status"><div>{!online || demo ? <WifiOff size={16} /> : <Wifi size={16} />}<span>{demo ? 'Modo de prueba local' : !online ? 'Sin conexión' : syncing ? 'Sincronizando…' : 'Con conexión'}<span className="connection-detail"> · {pending.length ? `${pending.length} ${pending.length === 1 ? 'descuento pendiente' : 'descuentos pendientes'}` : 'Sin descuentos pendientes'}</span></span></div><button onClick={() => void inventory.synchronize()} disabled={!online || syncing || demo} className="sync-button" aria-label="Sincronizar inventario"><RefreshCw size={17} className={syncing ? 'spin' : ''} /></button></div>
    <main id="main" className="workspace">
      {sessionExpired && <div className="notice warning"><strong>Vuelve a entrar para sincronizar</strong><p>Tus descuentos siguen guardados con esta cuenta.</p><a href="/login">Iniciar sesión</a></div>}
      {error && !sessionExpired && <p role="alert" className="notice warning">{error}</p>}
      {toast && <div className="toast" role="status"><Check size={18} /><span>{toast}</span><button aria-label="Cerrar mensaje" onClick={() => setToast('')}><X size={18} /></button></div>}
      {conflicts.length > 0 && tab !== 'queue' && <button className="conflict-notice" onClick={() => changeTab('queue')}><span>{conflicts.length} {conflicts.length === 1 ? 'movimiento necesita' : 'movimientos necesitan'} revisión</span><ChevronRight size={18} /></button>}

      {editing ? <ProductEditor key={editing.id} product={editing} userId={identity.id} online={online} demo={demo} onCancel={() => setEditing(null)} onSaved={async (product, photo) => { await inventory.acceptProduct(product, photo); setEditing(null); setToast('Producto actualizado.'); }} />
      : adding ? <section><button className="back-button" onClick={() => setAdding(false)}><ArrowLeft size={18} />Volver al inventario</button><div className="page-title"><h1>Nuevo producto</h1></div><p className="muted">El alta de productos necesita conexión.</p><form className="editor form-stack" onSubmit={createProduct}>
        <label>Nombre<input name="name" maxLength={200} required autoFocus disabled={busy} /></label><label>Descripción<textarea name="description" rows={3} maxLength={5000} disabled={busy} /></label><div className="form-columns"><label>Cantidad inicial<input name="quantity" type="number" min="0" max="2147483647" step="1" defaultValue="0" required disabled={busy} /></label><label>Precio<input name="price" type="number" min="0" max="9999999999.99" step="0.01" defaultValue="0" required disabled={busy} /></label></div><label className="upload-label"><Upload size={20} />Foto del producto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} /><small>JPG, PNG o WebP · hasta 5 MB</small></label>{formError && <p role="alert" className="error-text">{formError}</p>}<button className="button primary" disabled={busy || !online || demo}>{busy ? 'Guardando…' : 'Guardar producto'}<Check size={18} /></button></form></section>
      : selected ? <section><button className="back-button" onClick={() => { setSelected(null); setFormError(''); }}><ArrowLeft size={18} />Volver al inventario</button><div className="page-title"><h1>Descontar unidades</h1></div><div className="deduction-editor"><div className="selected-product"><ProductPhoto userId={identity.id} path={selected.photo_path} name={selected.name} /><div><h2>{selected.name}</h2><p className="muted">{selected.description}</p></div></div><form onSubmit={deduct} className="form-stack"><label>Unidades a descontar<div className="stepper"><button type="button" aria-label="Restar una unidad" onClick={() => setUnits(Math.max(1, units - 1))} disabled={units <= 1 || busy}><Minus size={20} /></button><input aria-label="Unidades a descontar" type="number" inputMode="numeric" min="1" max={Math.max(0, available(data?.products.find(p => p.id === selected.id)?.quantity || 0, selected.id, queue))} step="1" value={units} onChange={e => setUnits(Number(e.target.value))} required disabled={busy} /><button type="button" aria-label="Añadir una unidad" onClick={() => setUnits(units + 1)} disabled={units >= available(data?.products.find(p => p.id === selected.id)?.quantity || 0, selected.id, queue) || busy}><Plus size={20} /></button></div></label>
        <div className="stock-transition"><div><span>En este teléfono</span><strong>{available(data?.products.find(p => p.id === selected.id)?.quantity || 0, selected.id, queue)}</strong></div><ArrowRight aria-hidden="true" /><div><span>Después del descuento</span><strong>{Math.max(0, available(data?.products.find(p => p.id === selected.id)?.quantity || 0, selected.id, queue) - (units || 0))}</strong></div></div><p className="muted"><Clock3 size={16} className="inline-icon" />Se guarda aquí primero. Al sincronizar, se comprueba el stock compartido.</p>{formError && <p role="alert" className="error-text">{formError}</p>}<button className="button primary" disabled={busy || !Number.isInteger(units) || units <= 0 || units > available(data?.products.find(p => p.id === selected.id)?.quantity || 0, selected.id, queue)}>{busy ? 'Guardando…' : 'Guardar descuento'}<ArrowDownLeft size={20} /></button></form></div></section>
      : tab === 'inventory' ? <section><div className="page-title"><div><h1>Inventario</h1><p className="muted">Lo que tienes, a un vistazo.</p></div><button className="button primary new-button" onClick={() => { setAdding(true); setFormError(''); }} disabled={!online || demo} title={!online || demo ? 'Necesita conexión a Supabase' : 'Añadir un producto'}><Plus size={20} /><span>Nuevo producto</span></button></div>
        <div className="search-row"><label className="search-field"><Search size={20} aria-hidden="true" /><input aria-label="Buscar productos" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar productos" />{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={17} /></button>}</label></div>
        <div className="list-heading"><span>{products.length} {products.length === 1 ? 'producto' : 'productos'}</span><span>Disponibles en este teléfono</span></div>
        {products.length ? <ul className="product-list">{products.map(product => { const count = available(product.quantity, product.id, queue); const localCount = pending.filter(op => op.productId === product.id).reduce((n, op) => n + op.units, 0); return <li key={product.id}><ProductPhoto userId={identity.id} path={product.photo_path} name={product.name} /><div className="product-info"><h2>{product.name}</h2><p>{product.description || 'Sin descripción'}</p><span className="product-price">{price(product.price)} <small>precio unitario</small></span><button className="edit-button" disabled={!online} title={!online ? 'La edición necesita conexión' : 'Editar producto y foto'} onClick={() => { setEditing(product); setToast(''); }} aria-label={`Editar ${product.name}`}><Pencil size={14} aria-hidden="true" />Editar</button></div><div className="product-stock"><strong className={count <= 0 ? 'empty-stock' : ''}>{Math.max(0, count)}<small> uds.</small></strong>{localCount > 0 && <span className="pending-label">−{localCount} pendiente{localCount !== 1 ? 's' : ''}</span>}<button className="deduct-button" disabled={count <= 0} onClick={() => { setSelected(product); setUnits(1); setFormError(''); }} aria-label={`Descontar ${product.name}`}><Minus size={16} /><span>Descontar</span></button></div></li>; })}</ul> : <div className="empty-state"><PackageOpen size={40} /><h2>{query ? 'Sin coincidencias' : 'No hay productos con stock'}</h2><p>{query ? 'Prueba otro nombre de un producto con stock.' : data ? 'Los productos aparecerán aquí cuando tengan existencias disponibles.' : 'Conecta para descargar los productos de tu equipo.'}</p>{(query) && <button className="button secondary" onClick={() => { setQuery(''); }}>Ver todos</button>}</div>}
        <div className="cache-note"><CheckCheck size={18} aria-hidden="true" /><p>{demo ? 'Esta demostración conserva los descuentos al recargar. No se sincroniza con ninguna base de datos.' : data && offlineReady ? 'Catálogo guardado en este teléfono. Puedes seguir sin conexión.' : data ? 'Preparando el inicio sin conexión. Espera a que se complete antes de cerrar.' : 'Todavía no hay una copia local del catálogo.'}<small>{data ? `Última descarga: ${date(data.syncedAt)}` : 'La primera descarga necesita conexión.'}</small></p></div>
      </section>
      : tab === 'history' ? <section><div className="page-title"><div><h1>Historial</h1><p className="muted">Descuentos confirmados por la base de datos.</p></div><History className="title-icon" /></div>{data?.history.length ? <ul className="movement-list">{data.history.map(item => <li key={item.id}><div className="movement-symbol confirmed"><Check size={18} /></div><div className="movement-info"><h2>{item.product_name}</h2><p>{date(item.occurred_at || item.created_at)}</p><small>{item.performed_by === identity.id ? 'Registrado por ti' : 'Registrado por el equipo'} · confirmado {date(item.created_at)}</small></div><div className="movement-count"><strong>−{item.units}</strong><span>{item.quantity_before} → {item.quantity_after} uds.</span></div></li>)}</ul> : <div className="empty-state"><History size={40} /><h2>Aún no hay descuentos confirmados</h2><p>Los movimientos aparecen aquí después de sincronizarse. Los guardados solo en este teléfono están en Pendientes.</p><button className="button secondary" onClick={() => changeTab('queue')}>Ver pendientes</button></div>}<p className="footnote">Se guardan los 500 movimientos confirmados más recientes para consultarlos sin conexión.</p></section>
      : <section><div className="page-title"><div><h1>Pendientes</h1><p className="muted">Guardados en este teléfono.</p></div><button className="button secondary" disabled={!online || syncing || demo} onClick={() => void inventory.synchronize()}><RefreshCw size={18} className={syncing ? 'spin' : ''} /><span>{syncing ? 'Enviando…' : 'Sincronizar'}</span></button></div><p className="queue-explanation">Se enviarán al recuperar la conexión y al abrir la app. Si las existencias cambiaron, podrás revisar el movimiento aquí.</p>{queue.length ? <ul className="movement-list">{queue.map(op => <li key={op.id} className={op.status === 'conflict' ? 'conflict-row' : ''}><div className="movement-symbol"><Clock3 size={18} /></div><div className="movement-info"><h2>{op.productName}</h2><p>{date(op.occurredAt)}</p><span className={op.status === 'conflict' ? 'error-text' : 'pending-label'}>{op.status === 'conflict' ? 'Necesita revisión' : 'Esperando confirmación'}</span>{op.error && <p className="conflict-error">{op.error}</p>}{op.status === 'conflict' && <div className="conflict-actions"><button className="text-button" onClick={() => void inventory.resolve(op.id, true).catch(() => setToast('No se pudo guardar el cambio.'))} disabled={!online}>Reintentar</button><button className="text-button danger" onClick={() => { if (window.confirm('Este descuento fue rechazado por la base de datos. ¿Quitar el movimiento de este teléfono?')) void inventory.resolve(op.id, false).catch(() => setToast('No se pudo quitar el movimiento.')); }}>Quitar movimiento</button></div>}</div><div className="movement-count"><strong>−{op.units}</strong><span>uds.</span></div></li>)}</ul> : <div className="empty-state"><CheckCheck size={42} /><h2>Todo al día en este teléfono</h2><p>No hay descuentos esperando envío. Los movimientos confirmados están en el historial.</p><button className="button secondary" onClick={() => changeTab('inventory')}>Volver al inventario</button></div>}<div className="notice"><strong>Un pendiente todavía no es una reserva global.</strong><p>Otros usuarios pueden descontar el mismo producto mientras estás sin conexión. La disponibilidad final se comprueba al sincronizar.</p></div></section>}
    </main>
    <nav className="bottom-nav" aria-label="Navegación principal">{([{ id: 'inventory', label: 'Inventario', icon: Box }, { id: 'history', label: 'Historial', icon: History }, { id: 'queue', label: 'Pendientes', icon: Clock3 }] as const).map(item => <button key={item.id} onClick={() => changeTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><span className="nav-icon"><item.icon size={21} />{item.id === 'queue' && queue.length > 0 && <span className="count-badge">{queue.length}</span>}</span><span>{item.label}</span></button>)}</nav>
  </div>;
}
