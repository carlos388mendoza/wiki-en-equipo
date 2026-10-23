"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/ui/StatusScreen";

export default function OfflineError({ reset }: { error: Error; reset: () => void }) {
  // Las pantallas de error no admiten metadata: el título de la pestaña se pone aquí.
  useEffect(() => { document.title = "Sin conexión | Wiki Grupo Comidas"; }, []);
  return (
    <StatusScreen
      error="error_servidor"
      title="No se pudo abrir el modo sin conexión"
      message="Abre la wiki una vez con internet en este dispositivo para que quede lista para usarse sin conexión."
      action={<button type="button" onClick={reset} className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-on-ink hover:bg-brand hover:text-white">Intentar de nuevo</button>}
    />
  );
}
