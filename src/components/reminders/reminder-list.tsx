/**
 * Recordatorios pendientes de todas las mascotas, agrupados por urgencia.
 *
 * Recibe la forma `ReminderWithPet` de `src/server/queries.ts`, que ya trae el
 * nombre de la mascota resuelto para no consultar por fila.
 * Componente de servidor: los botones viven en `reminder-row-actions.tsx`.
 */

import { format, isBefore, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  BellRing,
  Cake,
  Pill,
  Repeat,
  Shield,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { ReminderRowActions } from "@/components/reminders/reminder-row-actions";
import { EmptyState, Eyebrow } from "@/components/ui/section";
import { RECURRENCE_LABELS, REMINDER_TYPE_LABELS, type ReminderType } from "@/domain/enums";
import { formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReminderWithPet } from "@/server/queries";

const REMINDER_ICONS: Record<ReminderType, LucideIcon> = {
  medication: Pill,
  vaccine: Syringe,
  deworming: Shield,
  checkup: Stethoscope,
  birthday: Cake,
  custom: Bell,
};

export function ReminderList({ items }: { items: ReminderWithPet[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BellRing className="size-8" />}
        title="No hay recordatorios pendientes"
        description="Crea recordatorios para las vacunas, las desparasitaciones y las revisiones."
      />
    );
  }

  const now = new Date();

  const overdue: ReminderWithPet[] = [];
  const today: ReminderWithPet[] = [];
  const upcoming: ReminderWithPet[] = [];

  for (const item of items) {
    const dueAt = new Date(item.reminder.dueAt);
    if (isBefore(dueAt, now)) overdue.push(item);
    else if (isToday(dueAt)) today.push(item);
    else upcoming.push(item);
  }

  return (
    <div className="flex flex-col gap-6">
      <ReminderGroup title="Vencidos" items={overdue} overdue />
      <ReminderGroup title="Hoy" items={today} />
      <ReminderGroup title="Próximos" items={upcoming} />
    </div>
  );
}

function ReminderGroup({
  title,
  items,
  overdue = false,
}: {
  title: string;
  items: ReminderWithPet[];
  overdue?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3
        className={cn(
          "eyebrow",
          overdue ? HEALTH_LEVEL_STYLES.alert.text : "text-muted-foreground",
        )}
      >
        {title} ({items.length})
      </h3>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <ReminderRow key={item.reminder.id} item={item} overdue={overdue} />
        ))}
      </ul>
    </section>
  );
}

function ReminderRow({ item, overdue }: { item: ReminderWithPet; overdue: boolean }) {
  const { reminder, petName } = item;
  const Icon = REMINDER_ICONS[reminder.type];
  const dueAt = parseISO(reminder.dueAt);

  return (
    <li
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4",
        overdue
          ? cn(HEALTH_LEVEL_STYLES.alert.bg, HEALTH_LEVEL_STYLES.alert.border)
          : "border-border bg-card",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-4">
        {/* Bloque de fecha: manda el día, el mes va debajo en versalitas. El
            filete vertical es lo que lo separa del contenido, sin caja. */}
        <div className="border-border flex shrink-0 flex-col items-center border-r pr-4">
          <span
            className={cn(
              "text-2xl leading-none font-extrabold tracking-[-0.02em]",
              overdue && HEALTH_LEVEL_STYLES.alert.text,
            )}
          >
            {format(dueAt, "d", { locale: es })}
          </span>
          <Eyebrow className="mt-1">{format(dueAt, "MMM", { locale: es })}</Eyebrow>
        </div>

        <div className="min-w-0">
          <Eyebrow className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" aria-hidden="true" />
            {REMINDER_TYPE_LABELS[reminder.type]}
          </Eyebrow>
          <h4 className="font-extrabold tracking-[-0.02em]">{reminder.title}</h4>

          <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span className="text-foreground font-medium">{petName}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTime(reminder.dueAt)}</span>
            <span className={cn(overdue && cn(HEALTH_LEVEL_STYLES.alert.text, "font-medium"))}>
              ({formatRelative(reminder.dueAt)})
            </span>
          </p>

          {reminder.recurrence !== "none" && (
            <span className="bg-muted text-muted-foreground eyebrow mt-2 inline-flex items-center gap-1.5 rounded px-2 py-1">
              <Repeat className="size-3" aria-hidden="true" />
              {RECURRENCE_LABELS[reminder.recurrence]}
            </span>
          )}

          {reminder.notes && (
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
              {reminder.notes}
            </p>
          )}
        </div>
      </div>

      <ReminderRowActions id={reminder.id} petId={reminder.petId} title={reminder.title} />
    </li>
  );
}
