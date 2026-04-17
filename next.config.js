/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors in node_modules (ox, wagmi internals) are not our code.
    // Run tsc --noEmit separately to check our own files.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Stub out optional server-only / React Native deps that wagmi/walletconnect
    // pull in transitively but are never used in a browser bundle.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
}

export default nextConfig
