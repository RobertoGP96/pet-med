import { Sparkles } from "lucide-react";

import { Eyebrow } from "@/components/ui/section";
import { pickDogFact } from "@/domain/dog-facts";

/**
 * Bloque «¿Sabías que…?» del mural.
 *
 * La curiosidad ya no viene de ninguna API: está escrita en español en
 * `src/domain/dog-facts.ts` y rota una al día. Por eso este componente ya no es
 * asíncrono ni puede quedarse sin nada que pintar.
 */
export function DogFact() {
  const fact = pickDogFact(new Date());

  return (
    <aside className="border-brand/20 bg-brand-muted/40 flex items-start gap-3 rounded-lg border p-4">
      <span className="bg-brand/15 text-brand grid size-8 shrink-0 place-items-center rounded">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <Eyebrow tone="brand">¿Sabías que…?</Eyebrow>
        <p className="text-sm">{fact}</p>
      </div>
    </aside>
  );
}
