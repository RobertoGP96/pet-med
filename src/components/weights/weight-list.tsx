/**
 * Histórico de peso, del más reciente al más antiguo, con la tendencia
 * calculada arriba: es la lectura clínicamente útil, no el último número.
 *
 * Componente de servidor: lo único interactivo (borrar) vive en
 * `weight-delete-button.tsx`.
 */

import { Minus, Scale, TrendingDown, TrendingUp } from "lucide-react";

import { WeightDeleteButton } from "@/components/weights/weight-delete-button";
import { EmptyState } from "@/components/ui/section";
import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import {
  assessBodyCondition,
  getWeightTrend,
  sortWeightsAscending,
  type WeightTrend,
} from "@/domain/health/weight";
import type { WeightEntry } from "@/domain/types";
import { formatDate, formatNumber, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
} as const;

export function WeightList({ weights, petId }: { weights: WeightEntry[]; petId: string }) {
  if (weights.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="size-8" />}
        title="Todavía no hay pesos registrados"
        description="Anota el peso cada pocas semanas: la tendencia detecta problemas antes que un único valor."
      />
    );
  }

  // La lista se pinta del más reciente al más antiguo.
  const ordered = sortWeightsAscending(weights).reverse();
  const trend = getWeightTrend(weights, new Date());

  return (
    <div className="flex flex-col gap-5">
      {trend && <WeightTrendCard trend={trend} />}

      <ul className="divide-border divide-y">
        {ordered.map((entry) => {
          const bcs =
            entry.bodyConditionScore != null
              ? assessBodyCondition(entry.bodyConditionScore)
              : null;

          return (
            <li key={entry.id} className="flex items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-base font-semibold">{formatWeight(entry.weightKg)}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(entry.measuredAt)}
                  </span>
                  {bcs && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        HEALTH_LEVEL_STYLES[bcs.level].bg,
                        HEALTH_LEVEL_STYLES[bcs.level].text,
                      )}
                    >
                      BCS {bcs.score} · {bcs.label}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-muted-foreground mt-1 text-sm">{entry.notes}</p>
                )}
              </div>

              <WeightDeleteButton id={entry.id} petId={petId} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WeightTrendCard({ trend }: { trend: WeightTrend }) {
  const styles = HEALTH_LEVEL_STYLES[trend.level];
  const Icon = TREND_ICONS[trend.direction];
  const signedKg = `${trend.changeKg > 0 ? "+" : ""}${formatNumber(trend.changeKg, 2)} kg`;
  const signedPercent = `${trend.changePercent > 0 ? "+" : ""}${formatNumber(trend.changePercent, 1)} %`;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", styles.bg, styles.border)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", styles.text)} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold">{formatWeight(trend.latest.weightKg)}</span>
          {trend.previous && (
            <span className={cn("text-sm font-medium", styles.text)}>
              {signedKg} ({signedPercent})
            </span>
          )}
          {trend.previous && trend.spanDays > 0 && (
            <span className="text-muted-foreground text-xs">en {trend.spanDays} días</span>
          )}
        </p>
        <p className="text-muted-foreground text-sm">{trend.message}</p>
      </div>
    </div>
  );
}
