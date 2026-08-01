/**
 * Historia clínica como línea de tiempo vertical, agrupada por año.
 *
 * Los eventos llegan ya ordenados del más reciente al más antiguo.
 * Componente de servidor: sólo el botón de borrar es de cliente.
 */

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  FlaskConical,
  ScanLine,
  Scissors,
  Shield,
  Siren,
  Sparkles,
  Stethoscope,
  StickyNote,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import { ClinicalEventDeleteButton } from "@/components/events/clinical-event-delete-button";
import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { EmptyState } from "@/components/ui/section";
import {
  CLINICAL_EVENT_TYPE_LABELS,
  type ClinicalEventType,
  type HealthLevel,
} from "@/domain/enums";
import type { ClinicalEvent } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<ClinicalEventType, LucideIcon> = {
  visit: Stethoscope,
  vaccine: Syringe,
  deworming: Shield,
  surgery: Scissors,
  lab: FlaskConical,
  imaging: ScanLine,
  emergency: Siren,
  grooming: Sparkles,
  note: StickyNote,
};

export function ClinicalTimeline({
  events,
  petId,
}: {
  events: ClinicalEvent[];
  petId: string;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Stethoscope className="size-8" />}
        title="La historia clínica está vacía"
        description="Registra consultas, vacunas y análisis para tener toda la vida médica en un solo sitio."
      />
    );
  }

  const now = new Date();

  // Los eventos ya vienen del más reciente al más antiguo: basta con partirlos
  // por año conservando ese orden.
  const years: { year: string; events: ClinicalEvent[] }[] = [];
  for (const event of events) {
    const year = event.occurredAt.slice(0, 4);
    const last = years.at(-1);
    if (last?.year === year) last.events.push(event);
    else years.push({ year, events: [event] });
  }

  return (
    <div className="flex flex-col gap-6">
      {years.map((group) => (
        <section key={group.year} className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {group.year}
          </h3>

          <ol className="border-border ml-3 flex flex-col border-l pl-6">
            {group.events.map((event) => (
              <TimelineEntry key={event.id} event={event} petId={petId} now={now} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineEntry({
  event,
  petId,
  now,
}: {
  event: ClinicalEvent;
  petId: string;
  now: Date;
}) {
  const Icon = EVENT_ICONS[event.type];

  return (
    <li className="relative pb-6 last:pb-0">
      {/* El punto se saca fuera del borde para que quede centrado sobre la línea. */}
      <span
        className="border-border bg-card text-muted-foreground absolute top-0.5 -left-[2.375rem] flex size-7 items-center justify-center rounded-full border"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {CLINICAL_EVENT_TYPE_LABELS[event.type]}
          </p>
          <h4 className="font-semibold">{event.title}</h4>
          <p className="text-muted-foreground text-sm">{formatDate(event.occurredAt)}</p>
        </div>

        <ClinicalEventDeleteButton id={event.id} petId={petId} title={event.title} />
      </div>

      {(event.vetName || event.clinic) && (
        <p className="text-muted-foreground mt-1 text-sm">
          {[event.vetName, event.clinic].filter(Boolean).join(" · ")}
        </p>
      )}

      {event.description && (
        <p className="mt-2 text-sm whitespace-pre-line">{event.description}</p>
      )}

      {event.nextDueAt && <NextDueChip nextDueAt={event.nextDueAt} now={now} />}
    </li>
  );
}

/** Chip del próximo refuerzo: alerta si ya pasó, vigilar si queda menos de un mes. */
function NextDueChip({ nextDueAt, now }: { nextDueAt: string; now: Date }) {
  const daysLeft = differenceInCalendarDays(parseISO(nextDueAt), now);

  const level: HealthLevel = daysLeft < 0 ? "alert" : daysLeft <= 30 ? "watch" : "good";
  const styles = HEALTH_LEVEL_STYLES[level];

  return (
    <span
      className={cn(
        "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles.bg,
        styles.text,
      )}
    >
      Próximo: {formatDate(nextDueAt)}
    </span>
  );
}
