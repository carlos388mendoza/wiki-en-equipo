import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Dominios desde los que next/image puede optimizar imágenes (ver lib/images.ts).
    // Los archivos subidos a la wiki se sirven por /archivos/:id con la sesión
    // del usuario y se muestran con `unoptimized`.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
