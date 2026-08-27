import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RESTUVEXO Restaurant Operating System',
    short_name: 'RESTUVEXO ROS',
    description: 'Cloud & Local standalone Restaurant Operating System for POS, KDS & QR Menu ordering',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ff5722',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  };
}
