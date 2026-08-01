"use client";

import { useState } from "react";

import { ReminderForm } from "@/components/reminders/reminder-form";
import { Select } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import type { Medication } from "@/domain/types";

export interface ReminderComposerPet {
  id: string;
  name: string;
  medications: Medication[];
}

/**
 * Alta de recordatorio desde la pantalla global.
 *
 * `ReminderForm` necesita una mascota concreta, así que aquí se elige primero.
 * La `key` fuerza a React a remontar el formulario al cambiar de mascota: sin
 * ella, los `defaultValue` de los campos se quedarían con los de la anterior.
 */
export function ReminderComposer({ pets }: { pets: ReminderComposerPet[] }) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const selected = pets.find((pet) => pet.id === petId) ?? pets[0];

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-5">
      {pets.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reminder-pet">Mascota</Label>
          <Select
            id="reminder-pet"
            value={petId}
            onChange={(event) => setPetId(event.target.value)}
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <ReminderForm
        key={selected.id}
        petId={selected.id}
        medications={selected.medications}
      />
    </div>
  );
}
