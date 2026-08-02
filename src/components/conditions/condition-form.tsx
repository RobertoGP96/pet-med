"use client";

/**
 * Alta y edición de un padecimiento.
 *
 * Cuando llega `condition` el formulario entra en modo edición: se manda su id
 * oculto y `saveConditionAction` actualiza en vez de insertar.
 */

import { useActionState } from "react";

import { Field, Select, TextInput, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import {
  CONDITION_CATEGORIES,
  CONDITION_CATEGORY_LABELS,
  CONDITION_STATUSES,
  CONDITION_STATUS_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
} from "@/domain/enums";
import type { Condition } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { toDateInputValue } from "@/lib/format";
import { saveConditionAction } from "@/server/actions";

export function ConditionForm({ petId, condition }: { petId: string; condition?: Condition }) {
  const [state, formAction] = useActionState(saveConditionAction, idleState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="petId" value={petId} />
      {condition && <input type="hidden" name="id" value={condition.id} />}

      <Field name="name" label="Padecimiento" required errors={state.fieldErrors}>
        <TextInput defaultValue={condition?.name ?? ""} placeholder="Dermatitis atópica" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="category" label="Categoría" errors={state.fieldErrors}>
          <Select defaultValue={condition?.category ?? "other"}>
            {CONDITION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CONDITION_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field name="severity" label="Gravedad" errors={state.fieldErrors}>
          <Select defaultValue={condition?.severity ?? "mild"}>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABELS[severity]}
              </option>
            ))}
          </Select>
        </Field>

        <Field name="status" label="Estado" errors={state.fieldErrors}>
          <Select defaultValue={condition?.status ?? "active"}>
            {CONDITION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CONDITION_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="diagnosedAt" label="Fecha de diagnóstico" required errors={state.fieldErrors}>
          <TextInput type="date" defaultValue={toDateInputValue(condition?.diagnosedAt ?? today)} />
        </Field>

        <Field
          name="resolvedAt"
          label="Fecha de resolución"
          errors={state.fieldErrors}
          hint="Déjala vacía si sigue abierto."
        >
          <TextInput type="date" defaultValue={toDateInputValue(condition?.resolvedAt ?? null)} />
        </Field>
      </div>

      <Field
        name="notes"
        label="Notas"
        errors={state.fieldErrors}
        hint="Síntomas, desencadenantes, pautas del veterinario…"
      >
        <Textarea rows={4} defaultValue={condition?.notes ?? ""} placeholder="Opcional" />
      </Field>

      <FormFeedback state={state} />

      <div>
        <SubmitButton>{condition ? "Guardar cambios" : "Registrar padecimiento"}</SubmitButton>
      </div>
    </form>
  );
}
