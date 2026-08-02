import type { HealthIndicator } from "@/domain/health/indicators";
import { cn } from "@/lib/utils";
import { HEALTH_ICONS, HEALTH_LEVEL_STYLES } from "./health-ui";

/**
 * Una celda por indicador calculado.
 *
 * No lleva borde propio: las celdas viven dentro de la rejilla de filete de 1px
 * de `HealthIndicatorGrid`, y ponerles un contorno encima duplicaría la línea.
 * El nivel de salud se lee en el color del icono y en el de la barra, siempre
 * desde `HEALTH_LEVEL_STYLES`.
 */
export function HealthIndicatorCard({ indicator }: { indicator: HealthIndicator }) {
  const Icon = HEALTH_ICONS[indicator.icon];
  const styles = HEALTH_LEVEL_STYLES[indicator.level];

  return (
    <article className="bg-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded", styles.bg)}>
          <Icon className={cn("size-4", styles.text)} aria-hidden="true" />
        </span>
        <h3 className="eyebrow text-muted-foreground">{indicator.label}</h3>
      </header>

      <p className="text-xl font-extrabold tracking-[-0.02em]">{indicator.value}</p>

      {indicator.progress != null && (
        <div
          className="bg-muted h-1.5 w-full overflow-hidden"
          role="progressbar"
          aria-valuenow={indicator.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={indicator.label}
        >
          <div
            className={cn("h-full transition-all", styles.dot)}
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

/**
 * La rejilla no separa los indicadores: los une. El fondo de la caja es el
 * color del borde y el `gap-px` lo deja ver entre celda y celda, que es como el
 * diseño dibuja los cuadros de datos.
 */
export function HealthIndicatorGrid({ indicators }: { indicators: HealthIndicator[] }) {
  return (
    <div className="bg-border border-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((indicator) => (
        <HealthIndicatorCard key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}
