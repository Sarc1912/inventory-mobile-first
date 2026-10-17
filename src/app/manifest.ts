import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inventario compartido', short_name: 'Inventario',
    description: 'Consulta productos y registra descuentos, incluso sin conexión.',
    start_url: '/inventario', scope: '/', display: 'standalone',
    background_color: '#f5f1e8', theme_color: '#183f37', lang: 'es',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
