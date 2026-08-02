"use client";

/**
 * Alta y edición de un tratamiento.
 *
 * El intervalo se ofrece como una lista de presets porque son los que se
 * recetan de verdad (cada 6/8/12/24/48 h y semanal); guardar el tratamiento
 * genera automáticamente el calendario de tomas de los próximos 30 días.
 */

import { useActionState } from "react";

import { Checkbox, Field, Select, TextInput, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { MEDICATION_ROUTES, MEDICATION_ROUTE_LABELS } from "@/domain/enums";
import type { Condition, Medication } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { formatInterval, toDateInputValue } from "@/lib/format";
import { saveMedicationAction } from "@/server/actions";

/** Pautas horarias habituales en veterinaria. */
const INTERVAL_PRESETS = [6, 8, 12, 24, 48, 168];

export function MedicationForm({
  petId,
  conditions,
  medication,
}: {
  petId: string;
  conditions: Condition[];
  medication?: Medication;
}) {
  const [state, formAction] = useActionState(saveMedicationAction, idleState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="petId" value={petId} />
      {medication && <input type="hidden" name="id" value={medication.id} />}

      <Field name="name" label="Medicamento" required errors={state.fieldErrors}>
        <TextInput defaultValue={medication?.name ?? ""} placeholder="Apoquel" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="dose" label="Dosis por toma" required errors={state.fieldErrors}>
          <TextInput
            type="number"
            step="0.001"
            min="0.001"
            defaultValue={medication?.dose ?? ""}
            placeholder="5,4"
          />
        </Field>

        <Field name="doseUnit" label="Unidad" required errors={state.fieldErrors}>
          <TextInput defaultValue={medication?.doseUnit ?? ""} placeholder="mg" />
        </Field>

        <Field name="route" label="Vía" errors={state.fieldErrors}>
          <Select defaultValue={medication?.route ?? "oral"}>
            {MEDICATION_ROUTES.map((route) => (
              <option key={route} value={route}>
                {MEDICATION_ROUTE_LABELS[route]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        name="intervalHours"
        label="Cada cuánto"
        required
        errors={state.fieldErrors}
        hint="Al guardar se planifican automáticamente las tomas de los próximos 30 días."
      >
        <Select defaultValue={String(medication?.intervalHours ?? 24)}>
          {/* Si el tratamiento guardado usa un intervalo fuera de los presets,
              se añade para no perderlo al editar. */}
          {[
            ...new Set(
              [...INTERVAL_PRESETS, medication?.intervalHours].filter(Boolean) as number[],
            ),
          ]
            .sort((a, b) => a - b)
            .map((hours) => (
              <option key={hours} value={hours}>
                {formatInterval(hours)}
              </option>
            ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="startDate" label="Inicio" required errors={state.fieldErrors}>
          <TextInput type="date" defaultValue={toDateInputValue(medication?.startDate ?? today)} />
        </Field>

        <Field
          name="endDate"
          label="Fin"
          errors={state.fieldErrors}
          hint="Vacío si es un tratamiento crónico."
        >
          <TextInput type="date" defaultValue={toDateInputValue(medication?.endDate ?? null)} />
        </Field>
      </div>

      <Field name="conditionId" label="Padecimiento que trata" errors={state.fieldErrors}>
        <Select defaultValue={medication?.conditionId ?? ""}>
          <option value="">Ninguno</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        name="instructions"
        label="Indicaciones"
        errors={state.fieldErrors}
        hint="Con comida, en ayunas, cómo conservarlo…"
      >
        <Textarea rows={3} defaultValue={medication?.instructions ?? ""} placeholder="Opcional" />
      </Field>

      <Checkbox
        name="isActive"
        label="Tratamiento activo"
        defaultChecked={medication?.isActive ?? true}
        hint="Sólo los activos generan tomas y avisos."
      />

      <FormFeedback state={state} />

      <div>
        <SubmitButton>{medication ? "Guardar cambios" : "Registrar tratamiento"}</SubmitButton>
      </div>
    </form>
  );
}
