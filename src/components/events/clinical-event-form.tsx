"use client";

/**
 * Alta y edición de un evento de la historia clínica: consultas, vacunas,
 * cirugías, análisis…
 */

import { useActionState } from "react";

import { Field, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { CLINICAL_EVENT_TYPES, CLINICAL_EVENT_TYPE_LABELS } from "@/domain/enums";
import type { ClinicalEvent } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { toDateInputValue } from "@/lib/format";
import { saveClinicalEventAction } from "@/server/actions";

export function ClinicalEventForm({
  petId,
  event,
}: {
  petId: string;
  event?: ClinicalEvent;
}) {
  const [state, formAction] = useActionState(saveClinicalEventAction, idleState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="petId" value={petId} />
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="type" label="Tipo de evento" errors={state.fieldErrors}>
          <Select defaultValue={event?.type ?? "visit"}>
            {CLINICAL_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CLINICAL_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field name="occurredAt" label="Fecha" required errors={state.fieldErrors}>
          <Input type="date" defaultValue={toDateInputValue(event?.occurredAt ?? today)} />
        </Field>
      </div>

      <Field name="title" label="Título" required errors={state.fieldErrors}>
        <Input
          type="text"
          defaultValue={event?.title ?? ""}
          placeholder="Vacuna polivalente anual"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="vetName" label="Veterinario/a" errors={state.fieldErrors}>
          <Input type="text" defaultValue={event?.vetName ?? ""} placeholder="Dra. Pérez" />
        </Field>

        <Field name="clinic" label="Clínica" errors={state.fieldErrors}>
          <Input type="text" defaultValue={event?.clinic ?? ""} placeholder="Centro Veterinario" />
        </Field>
      </div>

      <Field
        name="description"
        label="Descripción"
        errors={state.fieldErrors}
        hint="Hallazgos, tratamiento pautado, resultados…"
      >
        <Textarea rows={4} defaultValue={event?.description ?? ""} placeholder="Opcional" />
      </Field>

      <Field
        name="nextDueAt"
        label="Próxima cita prevista"
        errors={state.fieldErrors}
        hint="Para vacunas y desparasitaciones: cuándo toca el refuerzo"
      >
        <Input type="date" defaultValue={toDateInputValue(event?.nextDueAt ?? null)} />
      </Field>

      <FormFeedback state={state} />

      <div>
        <SubmitButton>{event ? "Guardar cambios" : "Añadir a la historia"}</SubmitButton>
      </div>
    </form>
  );
}
