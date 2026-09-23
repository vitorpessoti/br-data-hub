/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esconde o indicador do Next.js (canto inferior esquerdo) no modo dev.
  devIndicators: false,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    localPatterns: [{ pathname: "/**" }],
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
