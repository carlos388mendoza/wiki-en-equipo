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
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  // Fuentes de emojis, logos e iconos: un día en caché (antes max-age=0, se revalidaban en cada carga). No más,
  // porque al regenerar la fuente los trozos conservan el nombre y no deben mezclarse con una hoja nueva; con el
  // service worker, cada publicación usa su propia copia.
  async headers() {
    const day = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return ["/fonts/:path*", "/brand/:path*", "/iconos/:path*"].map((source) => ({ source, headers: day }));
  },
};

export default nextConfig;
