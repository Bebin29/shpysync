/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Asset-Pfade relativ machen für Electron file:// Protokoll
  assetPrefix: './',
  // Trailing Slash für korrekte Routen im file:// Kontext
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Service Worker deaktivieren für Electron-App
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Electron-spezifische Konfiguration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

