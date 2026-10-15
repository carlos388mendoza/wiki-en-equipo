import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "@/styles/globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Wiki Grupo Comidas", template: "%s | Wiki Grupo Comidas" },
  description: "Documentación y procesos de Grupo Comidas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
