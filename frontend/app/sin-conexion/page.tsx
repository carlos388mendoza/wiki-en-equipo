import { OfflineDrafts } from "@/components/offline/OfflineDrafts";

export const metadata = { title: "Borradores sin conexión" };

/**
 * Pantalla que funciona sin internet (el service worker la guarda al instalarse).
 * No pide datos al servidor: todo vive en este dispositivo. El editor es el mismo que con internet (#42).
 */
export default function OfflinePage() {
  return <OfflineDrafts />;
}
