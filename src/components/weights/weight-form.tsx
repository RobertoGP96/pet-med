"use client";

/**
 * Alta de un registro de peso.
 *
 * `addWeightAction` sólo inserta (no hay edición de un pesaje ya guardado), así
 * que este formulario no tiene modo edición: siempre añade una medición nueva.
 */

import { useActionState } from "react";

import { Field, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { assessBodyCondition } from "@/domain/health/weight";
import { idleState } from "@/lib/action-result";
import { addWeightAction } from "@/server/actions";

/** Escala de condición corporal de 9 puntos (Purina/WSAVA). */
const BCS_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function WeightForm({ petId }: { petId: string }) {
  const [state, formAction] = useActionState(addWeightAction, idleState);

  // La fecha por defecto es hoy: casi siempre se registra el peso el mismo día.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="petId" value={petId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="measuredAt" label="Fecha de la medición" required errors={state.fieldErrors}>
          <Input type="date" defaultValue={today} max={today} />
        </Field>

        <Field name="weightKg" label="Peso (kg)" required errors={state.fieldErrors}>
          <Input type="number" step="0.01" min="0.05" max="200" placeholder="12,5" />
        </Field>
      </div>

      <Field
        name="bodyConditionScore"
        label="Condición corporal (BCS)"
        errors={state.fieldErrors}
        hint="Escala de 9 puntos: 4 y 5 son el rango ideal."
      >
        <Select defaultValue="">
          <option value="">Sin valorar</option>
          {BCS_SCORES.map((score) => (
            <option key={score} value={score}>
              {score} — {assessBodyCondition(score).label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        name="notes"
        label="Notas"
        errors={state.fieldErrors}
        hint="Báscula usada, si venía de comer, cambios de dieta…"
      >
        <Textarea rows={3} placeholder="Opcional" />
      </Field>

      <FormFeedback state={state} />

      <div>
        <SubmitButton>Registrar peso</SubmitButton>
      </div>
    </form>
  );
}
