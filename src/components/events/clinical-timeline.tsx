/**
 * Historia clínica como listado editorial, agrupado por año.
 *
 * Cada entrada es una rejilla de dos columnas separada por un filete superior:
 * a la izquierda el cuándo, el tipo y quién lo firmó; a la derecha el motivo y
 * el detalle. Sin tarjetas ni línea de tiempo dibujada: lo que ordena la
 * lectura es el filete, como en una ficha impresa.
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
import { EmptyState, Eyebrow } from "@/components/ui/section";
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

export function ClinicalTimeline({ events, petId }: { events: ClinicalEvent[]; petId: string }) {
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
    <div className="flex flex-col gap-8">
      {years.map((group) => (
        <section key={group.year} className="flex flex-col gap-4">
          <h3 className="eyebrow text-muted-foreground">{group.year}</h3>

          <ol className="flex flex-col gap-4">
            {group.events.map((event) => (
              <TimelineEntry key={event.id} event={event} petId={petId} now={now} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineEntry({ event, petId, now }: { event: ClinicalEvent; petId: string; now: Date }) {
  const Icon = EVENT_ICONS[event.type];
  const signedBy = [event.vetName, event.clinic].filter(Boolean).join(" · ");

  return (
    <li className="border-border grid gap-x-8 gap-y-3 border-t pt-4 sm:grid-cols-[11rem_1fr]">
      {/* Columna izquierda: cuándo, de qué y quién lo firmó. */}
      <div className="flex flex-col gap-1.5">
        <p className="font-extrabold tracking-[-0.02em]">{formatDate(event.occurredAt)}</p>

        <Eyebrow tone="brand" className="inline-flex items-center gap-1.5">
          <Icon className="size-3.5" aria-hidden="true" />
          {CLINICAL_EVENT_TYPE_LABELS[event.type]}
        </Eyebrow>

        {signedBy && <p className="text-muted-foreground text-sm">{signedBy}</p>}
      </div>

      {/* Columna derecha: el motivo como título y el detalle debajo. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h4 className="min-w-0 flex-1 font-extrabold tracking-[-0.02em]">{event.title}</h4>
          <ClinicalEventDeleteButton id={event.id} petId={petId} title={event.title} />
        </div>

        {event.description && <p className="text-sm whitespace-pre-line">{event.description}</p>}

        {event.nextDueAt && <NextDueChip nextDueAt={event.nextDueAt} now={now} />}
      </div>
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
        "eyebrow inline-flex w-fit items-center rounded px-2 py-1",
        styles.bg,
        styles.text,
      )}
    >
      Próximo: {formatDate(nextDueAt)}
    </span>
  );
}
