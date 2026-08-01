"use client";

/**
 * Tomas de hoy y pendientes.
 *
 * Es la pantalla de trabajo diario: primero lo que ya se pasó de hora, después
 * lo que queda por delante hoy. Cada fila es un `<form>` propio con dos botones
 * de envío que sólo se diferencian en el `value` del campo `status`.
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, CircleCheck, Clock, SkipForward, type LucideIcon } from "lucide-react";
import { isToday } from "date-fns";

import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { EmptyState } from "@/components/ui/section";
import { DOSE_STATUS_LABELS, type DoseStatus, type HealthLevel } from "@/domain/enums";
import { getOverdueDoses } from "@/domain/health/medication";
import type { Medication, MedicationDose } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { formatDateTime, formatDose } from "@/lib/format";
import { cn } from "@/lib/utils";
import { updateDoseAction } from "@/server/actions";

export function DoseList({
  doses,
  medications,
  petId,
}: {
  doses: MedicationDose[];
  medications: Medication[];
  petId: string;
}) {
  const now = new Date();
  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));

  const overdue = getOverdueDoses(doses, now);

  // Pendientes de hoy cuya hora todavía no ha llegado.
  const upcomingToday = doses
    .filter(
      (dose) =>
        dose.status === "pending" &&
        isToday(new Date(dose.scheduledAt)) &&
        new Date(dose.scheduledAt) >= now,
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // Lo que ya se resolvió hoy se deja visible como confirmación de lo hecho.
  const resolvedToday = doses
    .filter((dose) => dose.status !== "pending" && isToday(new Date(dose.scheduledAt)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  if (overdue.length === 0 && upcomingToday.length === 0 && resolvedToday.length === 0) {
    return (
      <EmptyState
        icon={<CircleCheck className="size-8" />}
        title="No hay tomas pendientes"
        description="Cuando haya un tratamiento activo aparecerán aquí las tomas del día."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overdue.length > 0 && (
        <section
          className={cn(
            "flex flex-col gap-2 rounded-xl border p-4",
            HEALTH_LEVEL_STYLES.alert.bg,
            HEALTH_LEVEL_STYLES.alert.border,
          )}
        >
          <h3
            className={cn(
              "flex items-center gap-2 text-xs font-semibold tracking-wide uppercase",
              HEALTH_LEVEL_STYLES.alert.text,
            )}
          >
            <Clock className="size-4" aria-hidden="true" />
            Fuera de hora ({overdue.length})
          </h3>
          <ul className="divide-border divide-y">
            {overdue.map((dose) => (
              <DoseRow
                key={dose.id}
                dose={dose}
                medication={medicationById.get(dose.medicationId)}
                petId={petId}
              />
            ))}
          </ul>
        </section>
      )}

      {upcomingToday.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Hoy ({upcomingToday.length})
          </h3>
          <ul className="divide-border divide-y">
            {upcomingToday.map((dose) => (
              <DoseRow
                key={dose.id}
                dose={dose}
                medication={medicationById.get(dose.medicationId)}
                petId={petId}
              />
            ))}
          </ul>
        </section>
      )}

      {resolvedToday.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Ya registradas hoy ({resolvedToday.length})
          </h3>
          <ul className="divide-border divide-y">
            {resolvedToday.map((dose) => (
              <DoseRow
                key={dose.id}
                dose={dose}
                medication={medicationById.get(dose.medicationId)}
                petId={petId}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Semáforo de cada estado ya resuelto. */
const DOSE_STATUS_LEVELS: Record<DoseStatus, HealthLevel> = {
  pending: "unknown",
  taken: "good",
  skipped: "watch",
  missed: "alert",
};

function DoseRow({
  dose,
  medication,
  petId,
}: {
  dose: MedicationDose;
  medication: Medication | undefined;
  petId: string;
}) {
  const [state, formAction] = useActionState(updateDoseAction, idleState);
  const statusStyles = HEALTH_LEVEL_STYLES[DOSE_STATUS_LEVELS[dose.status]];

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {medication?.name ?? "Tratamiento eliminado"}
          {medication && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · {formatDose(medication.dose, medication.doseUnit)}
            </span>
          )}
        </p>
        <p className="text-muted-foreground text-xs">{formatDateTime(dose.scheduledAt)}</p>
        {state.status === "error" && state.message && (
          <p role="alert" className={cn("text-xs font-medium", HEALTH_LEVEL_STYLES.alert.text)}>
            {state.message}
          </p>
        )}
      </div>

      {dose.status === "pending" ? (
        <form action={formAction} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name="doseId" value={dose.id} />
          <input type="hidden" name="petId" value={petId} />
          <DoseStatusButton status="taken" label="Administrada" icon={Check} primary />
          <DoseStatusButton status="skipped" label="Omitir" icon={SkipForward} />
        </form>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            statusStyles.bg,
            statusStyles.text,
          )}
        >
          {DOSE_STATUS_LABELS[dose.status]}
        </span>
      )}
    </li>
  );
}

/**
 * Botón de envío que lleva el estado en su propio `value`: así las dos acciones
 * comparten un único formulario y no se anidan elementos interactivos.
 */
function DoseStatusButton({
  status,
  label,
  icon: Icon,
  primary = false,
}: {
  status: DoseStatus;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition",
        "focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-brand text-brand-foreground hover:opacity-90"
          : "border-border text-muted-foreground hover:bg-muted border",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
