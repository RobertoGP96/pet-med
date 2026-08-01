"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/**
 * Error boundary de la aplicación.
 *
 * Muestra el mensaje real: los errores que llegan aquí son de configuración o
 * de base de datos, y el mensaje concreto ("Falta SUPABASE_SECRET_KEY") es
 * justo lo que hace falta para arreglarlo.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <TriangleAlert className="text-health-alert size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Algo ha fallado</h1>
      <p className="text-muted-foreground max-w-lg text-sm whitespace-pre-line">
        {error.message}
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">Referencia: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="bg-brand text-brand-foreground mt-2 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition hover:opacity-90"
      >
        <RotateCcw className="size-4" />
        Reintentar
      </button>
    </div>
  );
}
