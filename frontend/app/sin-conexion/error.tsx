"use client";

import { StatusScreen } from "@/components/ui/StatusScreen";

export default function OfflineError({ reset }: { error: Error; reset: () => void }) {
  return (
    <StatusScreen
      error="error_servidor"
      title="No se pudo abrir el modo sin conexión"
      message="Abre la wiki una vez con internet en este dispositivo para que quede lista para usarse sin conexión."
      action={<button type="button" onClick={reset} className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">Intentar de nuevo</button>}
    />
  );
}
