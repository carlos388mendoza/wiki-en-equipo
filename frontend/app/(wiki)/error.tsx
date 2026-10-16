"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/ui/StatusScreen";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  // Las pantallas de error no admiten metadata: el título de la pestaña se pone aquí.
  useEffect(() => { document.title = "Algo salió mal | Wiki Grupo Comidas"; }, []);
  return (
    <StatusScreen
      error="error_servidor"
      action={
        <button type="button" onClick={reset} className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand">
          Intentar de nuevo
        </button>
      }
    />
  );
}
