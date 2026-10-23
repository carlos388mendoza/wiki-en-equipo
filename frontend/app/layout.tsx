import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "@/styles/globals.css";
import { THEME_SCRIPT } from "@/lib/theme";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

// El backend en un plan gratis puede tardar en responder mientras arranca o se reinicia: la función de
// Vercel espera hasta 60 s (el máximo del plan gratis) en lugar de cortar la petición.
export const maxDuration = 60;

// Dirección pública para las imágenes de Open Graph (en Vercel, el dominio de producción).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Wiki Grupo Comidas", template: "%s | Wiki Grupo Comidas" },
  description: "Documentación y procesos de Grupo Comidas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme lo pone el script antes de dibujar (el tema guardado en el dispositivo): por eso suppressHydrationWarning.
    <html lang="es" data-theme="auto" suppressHydrationWarning className={`${bricolage.variable} ${figtree.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Emojis de Apple (#54): trozos WOFF2 con unicode-range; el navegador solo descarga lo que usa. */}
        <link rel="stylesheet" href="/fonts/apple-emoji/AppleColorEmoji.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
