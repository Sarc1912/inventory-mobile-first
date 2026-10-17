'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Box, WifiOff } from 'lucide-react';
import { browserSupabase } from '@/lib/supabase/browser';
import { localIdentity } from '@/lib/offline/db';

export function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  useEffect(() => { void localIdentity().then(user => setHasLocal(Boolean(user && user.id !== 'demo-local'))).catch(() => {}); }, []);
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (!navigator.onLine) { setError('Necesitas conexión para iniciar sesión. Si ya entraste en este teléfono, abre tu copia local.'); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const client = browserSupabase();
      const { error: authError } = await client.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) });
      if (authError) throw new Error('No se pudo entrar. Revisa tu correo y contraseña.');
      const response = await fetch('/api/bootstrap', { cache: 'no-store' });
      if (response.status === 401) {
        await client.auth.signOut({ scope: 'local' });
        throw new Error('Tu cuenta aún no tiene acceso. Pide al responsable que active tu perfil.');
      }
      if (!response.ok) throw new Error('No se pudo cargar el inventario. Inténtalo de nuevo.');
      window.location.assign('/inventario');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo conectar. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  return <main className="login-layout">
    <section className="login-intro"><a className="brand" href="/"><Box aria-hidden="true" /><span>Inventario</span></a><div><h1>Tu inventario.<br />A mano.</h1><p>Encuentra un producto, descuenta unidades y lleva el control de cada movimiento.</p><div className="login-offline"><WifiOff aria-hidden="true" /><p>Si se corta la línea, sigue trabajando.<br />Tus descuentos esperan aquí hasta que vuelva.</p></div></div><small>Un mismo inventario para todo tu equipo.</small></section>
    <section className="login-form"><div className="login-form-inner"><h2>Entrar al inventario</h2><p className="muted">Usa la cuenta que te asignó el responsable.</p>
      {!configured ? <div className="notice"><strong>Falta conectar Supabase</strong><p>Configura las variables de entorno y aplica las migraciones para usar tus productos y cuentas.</p><a className="button primary" href="/demo">Explorar demostración <ArrowRight size={18} aria-hidden="true" /></a><small>Datos de ejemplo guardados solo en este navegador.</small></div> : <form onSubmit={login} className="form-stack">
        <label>Correo electrónico<input name="email" type="email" autoComplete="username" required placeholder="tu@correo.com" disabled={busy} /></label>
        <label>Contraseña<input name="password" type="password" autoComplete="current-password" required disabled={busy} /></label>
        {error && <p role="alert" className="error-text">{error}</p>}
        <button className="button primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}<ArrowRight size={18} aria-hidden="true" /></button>
      </form>}
      {hasLocal && <a href="/offline" className="button secondary local-link"><WifiOff size={18} aria-hidden="true" />Abrir copia local</a>}
      <p className="login-note">Para el primer acceso necesitas conexión. Después podrás usar el catálogo descargado desde este teléfono.</p>
    </div></section>
  </main>;
}
