import { BrandLogo } from "@/components/ui/BrandLogo";
import { StatusScreen } from "@/components/ui/StatusScreen";

export const metadata = { title: "Página no encontrada" };

/** Rutas que no existen fuera de las pantallas con sesión (por ejemplo, un enlace mal copiado). */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="flex flex-col items-center">
        <BrandLogo size={64} />
        <StatusScreen error="no_encontrada" />
      </div>
    </main>
  );
}
