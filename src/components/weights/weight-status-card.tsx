/**
 * Veredicto único sobre el estado de peso, calculado en
 * `assessWeightStatus`: aquí sólo se pinta. La tarjeta lleva la clasificación
 * («Ideal», «Sobrepeso»…), el peso ideal estimado cuando hay BCS y las
 * señales que sostienen el veredicto como distintivos secundarios.
 */

import { Scale } from "lucide-react";

import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import type { WeightStatus } from "@/domain/health/weight";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeightStatusCard({ status }: { status: WeightStatus }) {
  const styles = HEALTH_LEVEL_STYLES[status.level];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", styles.bg, styles.border)}>
      <Scale className={cn("mt-0.5 size-5 shrink-0", styles.text)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn("text-lg font-extrabold tracking-[-0.02em]", styles.text)}>
            {status.label}
          </span>
          <span className="text-muted-foreground text-sm">
            con {formatWeight(status.latest.weightKg)}
          </span>
        </p>

        <p className="text-muted-foreground text-sm">{status.message}</p>

        <div className="flex flex-wrap gap-2">
          {status.bcs && (
            <StatusChip level={status.bcs.level}>
              BCS {status.bcs.score}/9 · {status.bcs.label}
            </StatusChip>
          )}
          {status.idealWeightKg != null && (
            <StatusChip level="unknown">Peso ideal ≈ {formatWeight(status.idealWeightKg)}</StatusChip>
          )}
          {status.breedComparison && (
            <StatusChip level={status.breedComparison.level}>
              {status.breedComparison.label}
            </StatusChip>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusChip({
  level,
  children,
}: {
  level: keyof typeof HEALTH_LEVEL_STYLES;
  children: React.ReactNode;
}) {
  const styles = HEALTH_LEVEL_STYLES[level];
  return <span className={cn("eyebrow rounded px-2 py-1", styles.bg, styles.text)}>{children}</span>;
}
