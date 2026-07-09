export default function manifest() {
  return {
    name: 'RESTUVEXO Restaurant Operating System',
    short_name: 'RESTUVEXO ROS',
    description: 'Cloud & Local standalone Restaurant Operating System for POS, KDS & QR Menu ordering',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090d',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  }
}
