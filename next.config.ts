import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Google account avatars come back from the OAuth profile.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

export default nextConfig
