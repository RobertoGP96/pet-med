import Image from "next/image";

import { SPECIES_LABELS, type Species } from "@/domain/enums";
import { cn } from "@/lib/utils";

const SPECIES_EMOJI: Record<Species, string> = {
  dog: "🐶",
  cat: "🐱",
  rabbit: "🐰",
  bird: "🐦",
  rodent: "🐹",
  reptile: "🦎",
  other: "🐾",
};

/**
 * Avatar de la mascota con reserva cuando no hay foto: en vez de un hueco
 * gris, un emoji de su especie.
 *
 * Cuadrado y con la esquina apenas insinuada: en «Mancha» no hay círculos. La
 * foto va en blanco y negro y recupera el color al pasar el cursor, igual que
 * en las tarjetas del mural — de ahí el `group-hover`, que necesita la clase
 * `group` en el contenedor enlazable que envuelva al avatar.
 */
export function PetAvatar({
  name,
  species,
  url,
  size = 40,
  className,
}: {
  name: string;
  species: Species;
  url: string | null;
  size?: number;
  className?: string;
}) {
  if (!url) {
    return (
      <span
        role="img"
        aria-label={`${name}, ${SPECIES_LABELS[species].toLowerCase()} sin foto`}
        className={cn("bg-brand-muted grid shrink-0 place-items-center rounded-md", className)}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {SPECIES_EMOJI[species]}
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-md object-cover grayscale transition group-hover:grayscale-0",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
