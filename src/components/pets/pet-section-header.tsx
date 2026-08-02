import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PetAvatar } from "@/components/pets/pet-avatar";
import type { PetRef } from "@/server/queries";

/**
 * Cabecera de un bloque de mascota en las vistas transversales.
 *
 * Las tres páginas nuevas —vacunas, peso y fotos— repiten la misma estructura:
 * una franja por mascota con su avatar, su nombre, un dato de resumen a la
 * derecha y un enlace a la pestaña correspondiente de su ficha. Compartirla
 * aquí es lo que hace que las tres se lean como la misma página vista por
 * distintos cristales.
 */
export function PetSectionHeader({
  pet,
  /** Adónde lleva «Ver ficha»: la pestaña de esta misma materia. */
  href,
  /** Dato corto a la derecha del nombre: «3 vacunas», «28,4 kg»… */
  summary,
}: {
  pet: PetRef;
  href: string;
  summary?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <PetAvatar name={pet.name} species={pet.species} url={pet.avatarUrl} size={40} />

      <div className="flex min-w-0 flex-col">
        <h2 className="truncate text-lg font-extrabold tracking-[-0.02em]">{pet.name}</h2>
        {summary && <span className="text-muted-foreground text-xs">{summary}</span>}
      </div>

      <Link
        href={href}
        transitionTypes={["nav-forward"]}
        className="text-muted-foreground hover:text-brand group ml-auto flex shrink-0 items-center gap-1.5 text-sm font-extrabold transition"
      >
        Ver ficha
        <ArrowRight
          className="size-4 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
