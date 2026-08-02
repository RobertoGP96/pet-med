/**
 * Gráfica de evolución del peso.
 *
 * SVG escrito a mano en vez de una librería de gráficas: son ~80 líneas, se
 * renderiza en el servidor sin JavaScript en el cliente y evita añadir una
 * dependencia de las pesadas sólo para dibujar una línea.
 *
 * Los colores salen de la escala `--chart-*` de globals.css: la curva en el
 * rojo de marca (`--chart-1`) y los puntos en tinta (`--chart-5`), que es lo
 * que hace que cada medida se lea como una marca sobre la línea.
 */

import type { WeightEntry } from "@/domain/types";
import type { BreedWeightRange } from "@/domain/health/weight";
import { formatDate, formatWeight } from "@/lib/format";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

export function WeightChart({
  entries,
  breedRange,
}: {
  entries: WeightEntry[];
  breedRange?: BreedWeightRange | null;
}) {
  const points = [...entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));

  if (points.length < 2) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Hacen falta al menos dos pesos registrados para dibujar la evolución.
      </p>
    );
  }

  const weights = points.map((point) => point.weightKg);
  // El rango de la raza también entra en la escala, para que se vea la banda
  // aunque el peso actual esté fuera de ella.
  const candidates = [...weights, ...(breedRange ? [breedRange.minKg, breedRange.maxKg] : [])];

  const rawMin = Math.min(...candidates);
  const rawMax = Math.max(...candidates);
  // Un 10 % de aire arriba y abajo para que la línea no toque los bordes.
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.1;
  const max = rawMax + span * 0.1;

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) => PADDING.left + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) =>
    PADDING.top + plotHeight - ((value - min) / (max - min)) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.weightKg)}`).join(" ");
  const area = `${PADDING.left},${PADDING.top + plotHeight} ${line} ${x(points.length - 1)},${PADDING.top + plotHeight}`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolución del peso desde ${formatDate(first.measuredAt)} (${formatWeight(first.weightKg)}) hasta ${formatDate(last.measuredAt)} (${formatWeight(last.weightKg)})`}
      >
        {/* Banda del rango típico de la raza */}
        {breedRange && (
          <rect
            x={PADDING.left}
            y={y(breedRange.maxKg)}
            width={plotWidth}
            height={Math.max(0, y(breedRange.minKg) - y(breedRange.maxKg))}
            className="fill-health-good/10"
          />
        )}

        {/* Rejilla horizontal y etiquetas del eje Y */}
        {[0, 0.5, 1].map((ratio) => {
          const value = min + (max - min) * (1 - ratio);
          const yPos = PADDING.top + plotHeight * ratio;
          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yPos}
                y2={yPos}
                className="stroke-border"
                strokeDasharray="3 3"
              />
              <text
                x={PADDING.left - 8}
                y={yPos + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}

        <polygon points={area} className="fill-chart-1/10" />
        <polyline
          points={line}
          fill="none"
          className="stroke-chart-1"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={point.id}
            cx={x(index)}
            cy={y(point.weightKg)}
            r={3}
            className="fill-chart-5"
          >
            <title>{`${formatDate(point.measuredAt)}: ${formatWeight(point.weightKg)}`}</title>
          </circle>
        ))}

        {/* Sólo se etiquetan los extremos del eje X: con muchos registros las
            fechas intermedias se solapan y no aportan. */}
        <text x={PADDING.left} y={HEIGHT - 8} className="fill-muted-foreground text-[10px]">
          {formatDate(first.measuredAt)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 8}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {formatDate(last.measuredAt)}
        </text>
      </svg>

      {breedRange && (
        <figcaption className="text-muted-foreground text-xs">
          La banda verde es el rango de peso típico de la raza ({formatWeight(breedRange.minKg)} –{" "}
          {formatWeight(breedRange.maxKg)}).
        </figcaption>
      )}
    </figure>
  );
}
