import type { MetadataRoute } from "next";

/** App instalable (el service worker ya permite abrir páginas sin conexión). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wiki Grupo Comidas",
    short_name: "Wiki GC",
    description: "Documentación y procesos de Grupo Comidas",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e2001a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/logo-grupo-comidas.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
