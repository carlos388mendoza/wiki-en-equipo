import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Dominios desde los que next/image puede cargar imágenes.
    // Agrega aquí el dominio donde el backend guarde los archivos subidos.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
