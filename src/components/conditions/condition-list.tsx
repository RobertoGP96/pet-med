/**
 * Padecimientos en tarjetas, con lo abierto arriba.
 *
 * Lo resuelto o controlado no se esconde (sigue siendo historial clínico), pero
 * se atenúa para que la vista responda primero a «¿qué tiene ahora mismo?».
 */

import { HeartPulse } from "lucide-react";

import { ConditionDeleteButton } from "@/components/conditions/condition-delete-button";
import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { EmptyState, Eyebrow } from "@/components/ui/section";
import {
  CONDITION_CATEGORY_LABELS,
  CONDITION_STATUS_LABELS,
  SEVERITY_LABELS,
  type HealthLevel,
  type Severity,
} from "@/domain/enums";
import type { Condition } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** La gravedad se pinta con el mismo semáforo que el resto de indicadores. */
const SEVERITY_LEVELS: Record<Severity, HealthLevel> = {
  mild: "good",
  moderate: "watch",
  severe: "alert",
};

export function ConditionList({ conditions, petId }: { conditions: Condition[]; petId: string }) {
  if (conditions.length === 0) {
    return (
      <EmptyState
        icon={<HeartPulse className="size-8" />}
        title="Sin padecimientos registrados"
        description="Anota aquí alergias, enfermedades crónicas o lesiones para tenerlas a mano en la consulta."
      />
    );
  }

  const open = conditions.filter(
    (condition) => condition.status === "active" || condition.status === "in_treatment",
  );
  const closed = conditions.filter(
    (condition) => condition.status === "controlled" || condition.status === "resolved",
  );

  return (
    <div className="flex flex-col gap-6">
      {open.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow text-muted-foreground">Abiertos ({open.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {open.map((condition) => (
              <ConditionCard key={condition.id} condition={condition} petId={petId} />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow text-muted-foreground">
            Controlados y resueltos ({closed.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {closed.map((condition) => (
              <ConditionCard key={condition.id} condition={condition} petId={petId} dimmed />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ConditionCard({
  condition,
  petId,
  dimmed = false,
}: {
  condition: Condition;
  petId: string;
  dimmed?: boolean;
}) {
  const severityStyles = HEALTH_LEVEL_STYLES[SEVERITY_LEVELS[condition.severity]];

  return (
    <article
      className={cn(
        "border-border bg-card flex flex-col gap-3 rounded-lg border p-4",
        dimmed && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="leading-tight font-extrabold tracking-[-0.02em]">{condition.name}</h4>
          {/* Categoría, gravedad y estado van como rectángulos en versalitas, no
              como píldoras: en el lenguaje «Mancha» son rótulos, no etiquetas. */}
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow className="bg-muted rounded px-2 py-1">
              {CONDITION_CATEGORY_LABELS[condition.category]}
            </Eyebrow>
            <Eyebrow className={cn("rounded px-2 py-1", severityStyles.bg, severityStyles.text)}>
              {SEVERITY_LABELS[condition.severity]}
            </Eyebrow>
            <Eyebrow className="border-border rounded border px-2 py-1">
              {CONDITION_STATUS_LABELS[condition.status]}
            </Eyebrow>
          </div>
        </div>

        <ConditionDeleteButton id={condition.id} petId={petId} name={condition.name} />
      </div>

      <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt>Diagnóstico:</dt>
          <dd className="text-foreground">{formatDate(condition.diagnosedAt)}</dd>
        </div>
        {condition.resolvedAt && (
          <div className="flex gap-1">
            <dt>Resolución:</dt>
            <dd className="text-foreground">{formatDate(condition.resolvedAt)}</dd>
          </div>
        )}
      </dl>

      {condition.notes && (
        <p className="text-muted-foreground text-sm whitespace-pre-line">{condition.notes}</p>
      )}
    </article>
  );
}
