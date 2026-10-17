'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Identity, Operation, Snapshot, Product } from '../types';
import { clearIdentity, enqueue, localIdentity, operations, readPhoto, resolveConflict, savePhoto, saveSnapshot, setIdentity, snapshot, saveConfirmedProduct } from './db';
import { SessionError, syncInventory } from './sync';
import { demoSnapshot } from '../demo';

export function useInventory(serverIdentity?: Identity, demo = false) {
  const [identity, setUser] = useState<Identity | null>(serverIdentity || null);
  const identityRef = useRef<Identity | null>(serverIdentity || null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [queue, setQueue] = useState<Operation[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const running = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async () => {
    const id = identityRef.current?.id;
    if (!id) return;
    const [local, pending] = await Promise.all([snapshot(id), operations(id)]);
    setData(local || null);
    setQueue(pending);
  }, []);

  const synchronize = useCallback(async () => {
    const user = identityRef.current;
    if (demo || !user || !navigator.onLine || running.current) return;
    running.current = true; setSyncing(true);
    try {
      await syncInventory(user.id);
      setError(''); setSessionExpired(false);
      channel.current?.postMessage({ userId: user.id });
    } catch (cause) {
      if (cause instanceof SessionError) setSessionExpired(true);
      setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar. Los pendientes siguen guardados.');
    } finally {
      await reload().catch(() => setError('No se puede leer el almacenamiento del teléfono.'));
      running.current = false; setSyncing(false);
    }
  }, [reload, demo]);

  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      try {
        setOnline(navigator.onLine);
        if (demo && !(await snapshot(demoSnapshot.identity.id))) await saveSnapshot(demoSnapshot);
        let user = demo ? demoSnapshot.identity : serverIdentity || await localIdentity();
        if (!demo && user?.id === demoSnapshot.identity.id) user = undefined;
        if (!user && navigator.onLine) {
          const response = await fetch('/api/bootstrap', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (response.ok) {
            const value: Snapshot = await response.json();
            await saveSnapshot(value); user = value.identity;
          }
        }
        if (!alive) return;
        if (user) {
          identityRef.current = user; setUser(user); await setIdentity(user);
          await reload();
          void synchronize();
        }
      } catch {
        if (alive) setError('No se pudo abrir la copia local. Revisa que el navegador permita guardar datos.');
      } finally { if (alive) setReady(true); }
    };
    void initialize();
    const onOnline = () => { setOnline(true); void synchronize(); };
    const onOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === 'visible') { void reload(); void synchronize(); } };
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('inventory-updates');
      channel.current.onmessage = event => {
        if (event.data?.signedOut) { identityRef.current = null; setUser(null); setData(null); setQueue([]); }
        else if (event.data?.userId === identityRef.current?.id) void reload();
      };
    }
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void synchronize(); }, 30000);
    return () => {
      alive = false; window.clearInterval(interval); channel.current?.close();
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload, synchronize, serverIdentity, demo]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let alive = true;
    navigator.serviceWorker.register('/sw.js').then(async () => {
      await navigator.serviceWorker.ready;
      if (alive) setOfflineReady(true);
    }).catch(() => { if (alive) setError('No se pudo preparar el inicio offline. Mantén conexión e inténtalo de nuevo.'); });
    return () => { alive = false; };
  }, []);

  // Las fotografías privadas se almacenan por cuenta, fuera de la caché pública del SW.
  useEffect(() => {
    if (!data || !identity || !online) return;
    const controller = new AbortController();
    const download = async () => {
      for (const product of data.products) {
        if (!product.photo_path || controller.signal.aborted) continue;
        try {
          if (await readPhoto(identity.id, product.photo_path)) continue;
          const response = await fetch(`/api/photos/${product.photo_path.split('/').map(encodeURIComponent).join('/')}`, { signal: controller.signal });
          if (response.ok) {
            await savePhoto(identity.id, product.photo_path, await response.blob());
            window.dispatchEvent(new Event('inventory-photo'));
          }
        } catch { /* Una foto fallida se reintenta en la siguiente actualización. */ }
      }
    };
    void download();
    return () => controller.abort();
  }, [data, identity, online]);

  const deduct = async (productId: string, units: number) => {
    if (!identityRef.current) throw new Error('Inicia sesión primero.');
    await enqueue(identityRef.current.id, productId, units);
    await reload();
    channel.current?.postMessage({ userId: identityRef.current.id });
    void synchronize();
  };
  const resolve = async (id: string, retry: boolean) => {
    if (!identityRef.current) return;
    await resolveConflict(identityRef.current.id, id, retry);
    await reload();
    channel.current?.postMessage({ userId: identityRef.current.id });
    if (retry) void synchronize();
  };
  const closeLocalSession = async () => {
    await clearIdentity(); identityRef.current = null;
    setUser(null); setData(null); setQueue([]);
    channel.current?.postMessage({ signedOut: true });
  };
  const acceptProduct = async (product: Product, photo?: Blob) => {
    const user = identityRef.current;
    if (!user) return;
    try {
      await saveConfirmedProduct(user.id, product, photo);
      await reload();
      window.dispatchEvent(new Event('inventory-photo'));
      channel.current?.postMessage({ userId: user.id });
    } catch { setError('El producto se guardó en el servidor, pero no se pudo actualizar la copia local. Sincroniza para descargarlo.'); }
    void synchronize();
  };
  return { identity, data, queue, ready, online, syncing, error, sessionExpired, offlineReady, deduct, resolve, synchronize, closeLocalSession, acceptProduct };
}
