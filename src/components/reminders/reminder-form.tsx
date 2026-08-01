"use client";

/**
 * Alta y edición de un recordatorio.
 *
 * Sobre `dueAt`: el esquema exige un ISO completo con desfase horario
 * (`z.iso.datetime({ offset: true })`), pero un `<input type="datetime-local">`
 * envía "2026-08-01T09:00", sin zona. Por eso el control visible se llama
 * `dueAtLocal` (clave desconocida que zod descarta) y lo que viaja como `dueAt`
 * es un campo oculto que se sincroniza en cada cambio con
 * `new Date(valor).toISOString()`: el navegador interpreta el valor en la hora
 * local de quien lo escribe y lo convierte a UTC, que es como se guarda.
 */

import { useActionState, useState } from "react";

import { Field, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import {
  RECURRENCES,
  RECURRENCE_LABELS,
  REMINDER_TYPES,
  REMINDER_TYPE_LABELS,
} from "@/domain/enums";
import type { Medication, Reminder } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { formatDose, toDateTimeInputValue } from "@/lib/format";
import { saveReminderAction } from "@/server/actions";

export function ReminderForm({
  petId,
  medications,
  reminder,
}: {
  petId: string;
  medications: Medication[];
  reminder?: Reminder;
}) {
  const [state, formAction] = useActionState(saveReminderAction, idleState);

  // En edición ya tenemos el ISO guardado; en alta se rellena al elegir fecha.
  const [dueAtIso, setDueAtIso] = useState(reminder?.dueAt ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="petId" value={petId} />
      {reminder && <input type="hidden" name="id" value={reminder.id} />}

      <Field name="type" label="Tipo" errors={state.fieldErrors}>
        <Select defaultValue={reminder?.type ?? "custom"}>
          {REMINDER_TYPES.map((type) => (
            <option key={type} value={type}>
              {REMINDER_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field name="title" label="Título" required errors={state.fieldErrors}>
        <Input
          type="text"
          defaultValue={reminder?.title ?? ""}
          placeholder="Refuerzo de la vacuna de la rabia"
        />
      </Field>

      {/* Valor real que valida el esquema. */}
      <input type="hidden" name="dueAt" value={dueAtIso} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="dueAtLocal"
          label="Fecha y hora"
          required
          // Los errores llegan bajo la clave `dueAt`, que es la del esquema.
          errors={{ dueAtLocal: state.fieldErrors.dueAt ?? [] }}
        >
          <Input
            type="datetime-local"
            defaultValue={toDateTimeInputValue(reminder?.dueAt ?? null)}
            onChange={(event) => {
              const value = event.target.value;
              setDueAtIso(value ? new Date(value).toISOString() : "");
            }}
          />
        </Field>

        <Field name="recurrence" label="Repetición" errors={state.fieldErrors}>
          <Select defaultValue={reminder?.recurrence ?? "none"}>
            {RECURRENCES.map((recurrence) => (
              <option key={recurrence} value={recurrence}>
                {RECURRENCE_LABELS[recurrence]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        name="medicationId"
        label="Tratamiento relacionado"
        errors={state.fieldErrors}
        hint="Opcional: enlaza el recordatorio con un tratamiento en curso."
      >
        <Select defaultValue={reminder?.medicationId ?? ""}>
          <option value="">Ninguno</option>
          {medications.map((medication) => (
            <option key={medication.id} value={medication.id}>
              {medication.name} · {formatDose(medication.dose, medication.doseUnit)}
            </option>
          ))}
        </Select>
      </Field>

      <Field name="notes" label="Notas" errors={state.fieldErrors}>
        <Textarea rows={3} defaultValue={reminder?.notes ?? ""} placeholder="Opcional" />
      </Field>

      <FormFeedback state={state} />

      <div>
        <SubmitButton>{reminder ? "Guardar cambios" : "Crear recordatorio"}</SubmitButton>
      </div>
    </form>
  );
}
