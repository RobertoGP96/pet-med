import { Eyebrow } from "@/components/ui/section";
import { ActionLink } from "@/components/ui/action";
import { getNextBirthday } from "@/domain/health/age";
import type { MuralPet } from "@/domain/types";

const HEADLINE = "Cada mascota tiene su historial.";
/** Palabra que se lleva el rojo. Es la que da nombre a lo que hace la app. */
const ACCENT_WORD = 2;

/**
 * Portada del mural.
 *
 * Titular en peso 800 que entra palabra a palabra desenfocándose, sobre la
 * trama de huellas y la retícula técnica del diseño. Es HTML estático con dos
 * animaciones de CSS: no hace falta JavaScript de cliente para esto, así que la
 * portada se pinta entera en el servidor.
 *
 * `signedIn` cambia las dos llamadas a la acción: a quien no ha entrado se le
 * ofrece crear una cuenta, no «ver todas las fichas» —un enlace que le
 * devolvería al formulario de acceso—.
 */
export function MuralHero({ signedIn }: { signedIn: boolean }) {
  const words = HEADLINE.split(" ");

  return (
    <section className="paws border-border bg-card relative overflow-hidden rounded-lg border px-5 py-10 sm:px-10 sm:py-16">
      <div className="blueprint pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-1 flex flex-col items-start gap-6">
        <Eyebrow tone="brand">El mural · Expediente abierto</Eyebrow>

        {/* El titular se parte en palabras sólo para escalonar la entrada. Va
            entero en el `aria-label` para que un lector de pantalla no lo
            deletree palabra por palabra. */}
        <h1
          className="flex max-w-[16ch] flex-wrap gap-x-[0.28em] text-[2.5rem] leading-[0.98] font-extrabold tracking-[-0.03em] sm:text-6xl lg:text-7xl"
          aria-label={HEADLINE}
        >
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              aria-hidden="true"
              className={`word-in inline-block ${index === ACCENT_WORD ? "text-brand" : ""}`}
              style={{ animationDelay: `${(index * 0.08).toFixed(2)}s` }}
            >
              {word}
            </span>
          ))}
        </h1>

        <p className="text-muted-foreground max-w-[56ch] text-pretty">
          Las mascotas de la casa, sus fotos y todo lo que hay que saber de su salud. Peso,
          padecimientos, medicación, vacunas y recordatorios, con indicadores calculados a partir de
          lo que registras.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          {signedIn ? (
            <>
              <ActionLink href="/mascotas" variant="ink" transitionTypes={["nav-forward"]}>
                Ver todas las fichas
              </ActionLink>
              <ActionLink href="/mascotas/nueva" variant="outline" transitionTypes={["nav-forward"]}>
                Añadir mascota
              </ActionLink>
            </>
          ) : (
            <>
              <ActionLink href="/registro" variant="ink" transitionTypes={["nav-forward"]}>
                Crear una cuenta
              </ActionLink>
              <ActionLink href="/acceso" variant="outline" transitionTypes={["nav-forward"]}>
                Ya tengo cuenta
              </ActionLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Los cuatro contadores bajo la portada.
 *
 * Salen de las mascotas que ya se han leído para pintar la cinta, así que no
 * cuestan ninguna consulta extra.
 *
 * Antes contaban padecimientos y tratamientos activos. Ya no: el mural lo ve
 * cualquiera, y cuántas dolencias tiene la mascota de otra persona no es dato
 * de portada. Estos cuatro se calculan sólo con lo que el mural ya enseña.
 */
export function MuralStats({ pets }: { pets: MuralPet[] }) {
  const now = new Date();
  const withPhoto = pets.filter((pet) => pet.coverPhotoUrl ?? pet.avatarUrl).length;
  const species = new Set(pets.map((pet) => pet.species)).size;
  const birthdaysThisMonth = pets.filter((pet) => {
    if (!pet.birthDate) return false;
    return getNextBirthday(pet.birthDate, now).daysUntil <= 30;
  }).length;

  const stats = [
    { value: pets.length, label: "En el mural" },
    { value: withPhoto, label: "Con foto propia" },
    { value: species, label: "Especies distintas" },
    { value: birthdaysThisMonth, label: "Cumplen este mes" },
  ];

  return (
    // La rejilla es un bloque con fondo de borde y celdas separadas por 1px:
    // el filete entre cifras es del diseño, no un borde por celda.
    <dl className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card flex flex-col gap-1.5 px-4 py-4">
          <dd className="text-3xl leading-none font-extrabold tracking-[-0.02em] tabular-nums">
            {stat.value}
          </dd>
          <dt>
            <Eyebrow>{stat.label}</Eyebrow>
          </dt>
        </div>
      ))}
    </dl>
  );
}
