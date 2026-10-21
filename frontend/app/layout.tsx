import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, Noto_Color_Emoji } from "next/font/google";
import "@/styles/globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
// Fuente de emojis para que se vean igual en todos los dispositivos (#54).
const notoEmoji = Noto_Color_Emoji({ subsets: ["emoji"], variable: "--font-emoji", display: "swap", weight: "400" });

// El backend en un plan gratis puede tardar en responder mientras arranca o se reinicia: la función de
// Vercel espera hasta 60 s (el máximo del plan gratis) en lugar de cortar la petición.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { default: "Wiki Grupo Comidas", template: "%s | Wiki Grupo Comidas" },
  description: "Documentación y procesos de Grupo Comidas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${figtree.variable} ${notoEmoji.variable}`}>
      <body>{children}</body>
    </html>
  );
}
