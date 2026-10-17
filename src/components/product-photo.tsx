'use client';
import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { readPhoto } from '@/lib/offline/db';
export function ProductPhoto({ userId, path, name }: { userId: string; path: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    const load = async () => {
      if (!path) return;
      const blob = await readPhoto(userId, path);
      if (alive && blob) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      }
    };
    setUrl(null); void load().catch(() => {});
    window.addEventListener('inventory-photo', load);
    return () => { alive = false; window.removeEventListener('inventory-photo', load); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [userId, path]);
  return <div className="product-photo">{url ? <img src={url} alt={name} /> : <ImageOff size={22} aria-label="Foto no disponible en este teléfono" />}</div>;
}
