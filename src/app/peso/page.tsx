import { ArrowDownRight, ArrowRight, ArrowUpRight, PawPrint, Plus, Scale } from "lucide-react";

import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { WeightChart } from "@/components/health/weight-chart";
import { PetSectionHeader } from "@/components/pets/pet-section-header";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, Eyebrow, Section } from "@/components/ui/section";
import { getLatestWeight, getWeightTrend } from "@/domain/health/weight";
import type { WeightEntry } from "@/domain/types";
import { formatDate, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listWeightsByPet, type PetGroup } from "@/server/queries";

export const metadata = {
  title: "Peso",
  description: "La evolución del peso de todas tus mascotas en una sola vista.",
};

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const groups = await listWeightsByPet();
  // Una sola lectura del reloj para toda la página: la tendencia compara contra
  // el peso de hace 90 días y dos relojes distintos darían dos ventanas.
  const now = new Date();

  const pending = groups.filter((group) => group.items.length < 2).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="border-border flex flex-col gap-3 border-b pb-5">
        <Eyebrow tone="brand">Seguimiento</Eyebrow>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Peso</h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          La evolución de todas tus mascotas, una debajo de otra.
          {pending > 0 &&
            ` ${pending} ${pending === 1 ? "necesita" : "necesitan"} más registros para dibujar la curva.`}
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="size-10" />}
          title="Todavía no hay mascotas"
          description="Da de alta una mascota y registra su peso: aquí verás cómo evoluciona y si se aleja del rango de su raza."
          action={
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Añadir mascota
            </ActionLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <PetWeightCard key={group.pet.id} group={group} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function PetWeightCard({ group, now }: { group: PetGroup<WeightEntry>; now: Date }) {
  const { pet, items } = group;
  const latest = getLatestWeight(items);
  const trend = getWeightTrend(items, now);

  return (
    <Section className="flex flex-col gap-5">
      <PetSectionHeader
        pet={pet}
        href={`/mascotas/${pet.id}/peso`}
        summary={
          latest
            ? `Último: ${formatWeight(latest.weightKg)} · ${formatDate(latest.measuredAt)}`
            : "Sin pesajes"
        }
      />

      {trend && <TrendBadge trend={trend} />}

      {items.length === 0 ? (
        // Sin ningún registro no hay nada que dibujar, y el mensaje del gráfico
        // («hacen falta dos») sonaría a error. Aquí lo que falta es empezar.
        <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center">
          <Scale className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            {pet.name} todavía no tiene ningún pesaje.
          </p>
          <ActionLink href={`/mascotas/${pet.id}/peso`} variant="outline" size="sm">
            Registrar el primero
            <ArrowRight className="size-4" />
          </ActionLink>
        </div>
      ) : (
        // El rango de la raza no se pinta aquí: exigiría una llamada a la API de
        // razas por mascota para una página que ya carga varias curvas. Esa
        // comparación está en la pestaña de peso de cada ficha.
        <WeightChart entries={items} />
      )}
    </Section>
  );
}

function TrendBadge({ trend }: { trend: NonNullable<ReturnType<typeof getWeightTrend>> }) {
  const styles = HEALTH_LEVEL_STYLES[trend.level];
  const Icon =
    trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : ArrowRight;

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
        styles.border,
        styles.bg,
        styles.text,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="font-extrabold tracking-[-0.02em]">{trend.message}</span>
      <span className="text-muted-foreground ml-auto text-xs">
        {trend.spanDays} días · {formatWeight(trend.latest.weightKg)}
      </span>
    </p>
  );
}
