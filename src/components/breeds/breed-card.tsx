import Image from "next/image";
import { PawPrint } from "lucide-react";

import { BreedBadges } from "@/components/health/breed-traits";
import { Eyebrow } from "@/components/ui/section";
import type { BreedProfile } from "@/domain/breed";

/** Una raza de la guía: lo que se sabe de ella y una foto de ejemplo. */
export interface FeaturedBreed {
  /** Nombre en español; es el que se muestra si la API no responde. */
  name: string;
  /** Ficha de dogapi.dog, o `null` si no se encontró la raza. */
  profile: BreedProfile | null;
  /** Foto de ejemplo de dog.ceo, o `null` si no hubo forma de emparejarla. */
  photoUrl: string | null;
}

/** `10` y `12` -> `10 – 12`; con un solo valor, ese valor a secas. */
function formatRange(min: number, max: number): string {
  const format = (value: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
  return min === max ? format(min) : `${format(min)} – ${format(max)}`;
}

/**
 * Ficha de raza de la guía del mural.
 *
 * Se pinta con lo que haya: la reseña y los rangos vienen de dogapi.dog y la
 * foto de dog.ceo, dos fuentes distintas que fallan por separado. Una raza sin
 * foto sigue mereciendo su ficha, y una con foto pero sin datos también.
 */
export function BreedCard({ breed, sizes }: { breed: FeaturedBreed; sizes: string }) {
  const { profile, photoUrl } = breed;
  const name = profile?.name ?? breed.name;

  return (
    <article className="group border-border bg-card hover:border-brand flex flex-col overflow-hidden rounded-lg border transition">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`Ejemplar de ${name}`}
            fill
            sizes={sizes}
            quality={60}
            className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
          />
        ) : (
          <div className="paws text-muted-foreground/40 grid h-full place-items-center">
            <PawPrint className="size-10" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-extrabold tracking-[-0.02em]">{name}</h3>

        {profile && <BreedBadges breed={profile} />}

        {(profile?.lifeSpan || profile?.weightRange) && (
          // El filete va por celda y no como rejilla de `gap-px`: según la raza
          // hay uno o dos datos, y una fila a medias dejaría un hueco de color
          // de borde.
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {profile.lifeSpan && (
              <div className="border-border flex flex-col gap-0.5 border-t pt-2">
                <dt>
                  <Eyebrow>Vive</Eyebrow>
                </dt>
                <dd className="tabular-nums">
                  {formatRange(profile.lifeSpan.minYears, profile.lifeSpan.maxYears)} años
                </dd>
              </div>
            )}
            {profile.weightRange && (
              <div className="border-border flex flex-col gap-0.5 border-t pt-2">
                <dt>
                  <Eyebrow>Pesa</Eyebrow>
                </dt>
                <dd className="tabular-nums">
                  {formatRange(profile.weightRange.minKg, profile.weightRange.maxKg)} kg
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* `lang` sale del perfil: la reseña está traducida salvo que la API
            haya estrenado una raza que aún no lo esté. */}
        {profile?.description && (
          <p
            className="text-muted-foreground mt-auto line-clamp-4 pt-1 text-xs text-pretty"
            lang={profile.descriptionLang}
          >
            {profile.description}
          </p>
        )}
      </div>
    </article>
  );
}
