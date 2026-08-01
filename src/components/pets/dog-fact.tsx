import { Sparkles } from "lucide-react";

import { getDogFact } from "@/services/breeds/facts";

/**
 * Bloque «¿Sabías que…?» del mural.
 *
 * Si la API de curiosidades no responde, `getDogFact` devuelve `null` y este
 * componente no pinta nada: es un adorno, no debe dejar un hueco ni un error.
 */
export async function DogFact() {
  const fact = await getDogFact();
  if (!fact) return null;

  return (
    <aside className="border-brand/20 bg-brand-muted/40 flex items-start gap-3 rounded-xl border p-4">
      <span className="bg-brand/15 text-brand grid size-8 shrink-0 place-items-center rounded-lg">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          ¿Sabías que…?
        </p>
        {/* El dato llega en inglés desde dogapi.dog. */}
        <p className="text-sm" lang="en">
          {fact}
        </p>
      </div>
    </aside>
  );
}
