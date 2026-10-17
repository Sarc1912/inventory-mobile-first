import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';
export const metadata: Metadata = {
  title: 'Inventario', description: 'Tu inventario compartido, incluso sin conexión.',
  manifest: '/manifest.webmanifest', icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Inventario' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#183f37' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
