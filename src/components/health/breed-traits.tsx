import type { BreedProfile, BreedTraits as Traits } from "@/domain/breed";
import { cn } from "@/lib/utils";

/**
 * Rasgos de raza puntuados del 1 al 5.
 *
 * Hoy sólo los publica The Cat API. En perros llegan a `null` y el bloque no
 * se pinta; en su lugar la ficha muestra el grupo y si es hipoalergénico.
 */

interface TraitRow {
  key: keyof Traits;
  label: string;
  /** Si es cierto, más puntuación = más carga para quien cuida. */
  higherIsDemanding?: boolean;
}

const ROWS: TraitRow[] = [
  { key: "energyLevel", label: "Energía" },
  { key: "affectionLevel", label: "Cariño" },
  { key: "intelligence", label: "Inteligencia" },
  { key: "adaptability", label: "Adaptabilidad" },
  { key: "childFriendly", label: "Con niños" },
  { key: "dogFriendly", label: "Con perros" },
  { key: "strangerFriendly", label: "Con desconocidos" },
  { key: "socialNeeds", label: "Necesidad de compañía", higherIsDemanding: true },
  { key: "grooming", label: "Cepillado necesario", higherIsDemanding: true },
  { key: "sheddingLevel", label: "Muda de pelo", higherIsDemanding: true },
  { key: "vocalisation", label: "Nivel de maullido", higherIsDemanding: true },
  { key: "healthIssues", label: "Problemas de salud típicos", higherIsDemanding: true },
];

function TraitScale({ value, demanding }: { value: number; demanding?: boolean }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1.5 w-5 rounded-full transition",
            step <= value
              ? demanding && value >= 4
                ? "bg-health-watch"
                : "bg-brand"
              : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function BreedTraitsList({ breed }: { breed: BreedProfile }) {
  const traits = breed.traits;
  if (!traits) return null;

  const rows = ROWS.filter((row) => traits[row.key] != null);
  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => {
        const value = traits[row.key]!;
        return (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground text-sm">{row.label}</dt>
            <dd className="flex items-center gap-2">
              <TraitScale value={value} demanding={row.higherIsDemanding} />
              <span className="sr-only">{value} de 5</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Datos sueltos que sí tenemos de perros: grupo e hipoalergenia. */
export function BreedBadges({ breed }: { breed: BreedProfile }) {
  const badges: string[] = [];

  if (breed.breedGroup) badges.push(breed.breedGroup);
  if (breed.hypoallergenic === true) badges.push("Hipoalergénico");
  if (breed.hypoallergenic === false) badges.push("No hipoalergénico");

  if (badges.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <li
          key={badge}
          className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium"
        >
          {badge}
        </li>
      ))}
    </ul>
  );
}
