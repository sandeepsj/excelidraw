import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@excalidraw/excalidraw'],
  turbopack: {},
  async headers() {
    return [
      {
        source: '/diagram/:id/view',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ]
  },
}

export default nextConfig
