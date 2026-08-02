"use client";

/**
 * Botones de moderación de una mascota del mural.
 *
 * Cada uno va en su propio `<form>` con su `useActionState`: si compartieran
 * estado, destacar una mascota pintaría el mensaje de éxito también bajo el
 * botón de ocultar. Es el mismo patrón que siguen las filas de la agenda y de
 * la galería.
 *
 * El valor que se manda es el estado DESEADO, no un «alternar»: así el servidor
 * no tiene que leer la fila antes de escribirla, y dos pulsaciones seguidas por
 * error dejan la mascota donde debe estar y no de vuelta al principio.
 */

import { useActionState } from "react";
import { EyeOff, Star, Undo2 } from "lucide-react";

import { FormFeedback } from "@/components/ui/form-feedback";
import { actionStyles } from "@/components/ui/action";
import { idleState } from "@/lib/action-result";
import { setPetFeaturedAction, setPetHiddenAction } from "@/server/actions";
import { cn } from "@/lib/utils";

export function MuralModeration({
  petId,
  featured,
  hidden,
}: {
  petId: string;
  featured: boolean;
  hidden: boolean;
}) {
  const [featureState, featureAction, featurePending] = useActionState(
    setPetFeaturedAction,
    idleState,
  );
  const [hideState, hideAction, hidePending] = useActionState(setPetHiddenAction, idleState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {/* Destacar no tiene sentido sobre algo que no se ve. */}
        {!hidden && (
          <form action={featureAction}>
            <input type="hidden" name="petId" value={petId} />
            <input type="hidden" name="featured" value={featured ? "false" : "true"} />
            <button
              type="submit"
              disabled={featurePending}
              className={cn(
                actionStyles({ variant: featured ? "brand" : "outline", size: "sm" }),
                "disabled:opacity-60",
              )}
            >
              <Star className={cn("size-4", featured && "fill-current")} aria-hidden="true" />
              {featured ? "Destacada" : "Destacar"}
            </button>
          </form>
        )}

        <form action={hideAction}>
          <input type="hidden" name="petId" value={petId} />
          <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
          <button
            type="submit"
            disabled={hidePending}
            className={cn(
              actionStyles({ variant: hidden ? "outline" : "danger", size: "sm" }),
              "disabled:opacity-60",
            )}
          >
            {hidden ? (
              <>
                <Undo2 className="size-4" aria-hidden="true" />
                Devolver al mural
              </>
            ) : (
              <>
                <EyeOff className="size-4" aria-hidden="true" />
                Retirar
              </>
            )}
          </button>
        </form>
      </div>

      <FormFeedback state={featureState} />
      <FormFeedback state={hideState} />
    </div>
  );
}
