import type { HealthIndicator } from "@/domain/health/indicators";
import { cn } from "@/lib/utils";
import { HEALTH_ICONS, HEALTH_LEVEL_STYLES } from "./health-ui";

/** Una tarjeta por indicador calculado. */
export function HealthIndicatorCard({ indicator }: { indicator: HealthIndicator }) {
  const Icon = HEALTH_ICONS[indicator.icon];
  const styles = HEALTH_LEVEL_STYLES[indicator.level];

  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 transition",
        styles.border,
      )}
    >
      <header className="flex items-center gap-2">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", styles.bg)}>
          <Icon className={cn("size-4", styles.text)} aria-hidden="true" />
        </span>
        <h3 className="text-muted-foreground text-sm font-medium">{indicator.label}</h3>
      </header>

      <p className="text-xl font-semibold tracking-tight">{indicator.value}</p>

      {indicator.progress != null && (
        <div
          className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={indicator.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={indicator.label}
        >
          <div
            className={cn("h-full rounded-full transition-all", styles.dot)}
            style={{ width: `${indicator.progress}%` }}
          />
        </div>
      )}

      {indicator.detail && (
        <p className="text-muted-foreground text-xs leading-relaxed">{indicator.detail}</p>
      )}
    </article>
  );
}

export function HealthIndicatorGrid({ indicators }: { indicators: HealthIndicator[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((indicator) => (
        <HealthIndicatorCard key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}
