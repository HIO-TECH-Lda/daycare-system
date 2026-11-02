import type { MetadataRoute } from 'next';

/** Lets families and staff install the portal on phones, tablets and laptops (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sonho de Criança',
    short_name: 'Sonho de Criança',
    description: 'Portal do Centro Infantil Sonho de Criança',
    lang: 'pt-MZ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fbfaf7',
    theme_color: '#608034',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
