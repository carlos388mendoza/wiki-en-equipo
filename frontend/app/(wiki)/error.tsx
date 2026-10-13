"use client";

import { StatusScreen } from "@/components/ui/StatusScreen";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <StatusScreen
      error="error_servidor"
      action={
        <button type="button" onClick={reset} className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">
          Intentar de nuevo
        </button>
      }
    />
  );
}
