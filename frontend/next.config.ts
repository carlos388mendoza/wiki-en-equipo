import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sin el optimizador de Next (/_next/image no existe en el proyecto único de Vercel): ver lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Dominios de fotos que se piden redimensionadas a su CDN (ver lib/images.ts).
    // Los archivos subidos a la wiki se sirven por /archivos/:id con la sesión
    // del usuario y se muestran con `unoptimized`.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
