"use client";

import { useActionState, useState } from "react";

import { Field, Checkbox, Select, TextInput, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { Section } from "@/components/ui/section";
import {
  SEXES,
  SEX_LABELS,
  SIZES,
  SIZE_LABELS,
  SPECIES,
  SPECIES_LABELS,
  type Species,
} from "@/domain/enums";
import type { Pet } from "@/domain/types";
import { idleState } from "@/lib/action-result";
import { createPetAction, updatePetAction } from "@/server/actions";

export interface BreedOption {
  id: string;
  name: string;
  species: Species;
}

/**
 * Alta y edición de mascota.
 *
 * Un único componente para los dos casos: si llega `pet`, cambia la acción y
 * precarga los valores. Así no hay dos formularios que se desincronicen.
 */
export function PetForm({ pet, breeds }: { pet?: Pet; breeds: BreedOption[] }) {
  const [state, formAction] = useActionState(pet ? updatePetAction : createPetAction, idleState);

  // La especie se controla en cliente sólo para filtrar el catálogo de razas
  // que se ofrece como sugerencia.
  const [species, setSpecies] = useState<Species>(pet?.species ?? "dog");
  const breedSuggestions = breeds.filter((breed) => breed.species === species);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {pet && <input type="hidden" name="petId" value={pet.id} />}

      <Section title="Identidad">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="Nombre" required errors={state.fieldErrors}>
            <TextInput defaultValue={pet?.name} placeholder="Luna" autoComplete="off" />
          </Field>

          <Field name="species" label="Especie" required errors={state.fieldErrors}>
            <Select
              defaultValue={pet?.species ?? "dog"}
              onChange={(event) => setSpecies(event.target.value as Species)}
            >
              {SPECIES.map((value) => (
                <option key={value} value={value}>
                  {SPECIES_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            name="breed"
            label="Raza"
            errors={state.fieldErrors}
            hint={
              breedSuggestions.length > 0
                ? "Escribe o elige del catálogo. Sirve para calcular el rango de peso y la esperanza de vida."
                : undefined
            }
          >
            <TextInput
              defaultValue={pet?.breed ?? ""}
              list={breedSuggestions.length > 0 ? "breed-options" : undefined}
              placeholder="Golden retriever"
              autoComplete="off"
            />
          </Field>

          {breedSuggestions.length > 0 && (
            <datalist id="breed-options">
              {breedSuggestions.map((breed) => (
                <option key={breed.id} value={breed.name} />
              ))}
            </datalist>
          )}

          <Field
            name="size"
            label="Tamaño"
            errors={state.fieldErrors}
            hint="Determina a qué edad se considera senior."
          >
            <Select defaultValue={pet?.size ?? ""}>
              <option value="">Sin definir</option>
              {SIZES.map((value) => (
                <option key={value} value={value}>
                  {SIZE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field name="sex" label="Sexo" errors={state.fieldErrors}>
            <Select defaultValue={pet?.sex ?? "unknown"}>
              {SEXES.map((value) => (
                <option key={value} value={value}>
                  {SEX_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field name="color" label="Color" errors={state.fieldErrors}>
            <TextInput defaultValue={pet?.color ?? ""} placeholder="Dorado" autoComplete="off" />
          </Field>
        </div>
      </Section>

      <Section title="Fechas y datos oficiales">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="birthDate"
            label="Fecha de nacimiento"
            errors={state.fieldErrors}
            hint="Sin ella no se puede calcular la edad ni la etapa vital."
          >
            <TextInput type="date" defaultValue={pet?.birthDate ?? ""} />
          </Field>

          <Field name="adoptionDate" label="Fecha de adopción" errors={state.fieldErrors}>
            <TextInput type="date" defaultValue={pet?.adoptionDate ?? ""} />
          </Field>

          <Field name="microchip" label="Microchip" errors={state.fieldErrors}>
            <TextInput defaultValue={pet?.microchip ?? ""} autoComplete="off" inputMode="numeric" />
          </Field>

          <div className="flex items-end pb-2">
            <Checkbox
              name="sterilized"
              label="Esterilizado o castrado"
              defaultChecked={pet?.sterilized}
            />
          </div>
        </div>
      </Section>

      <Section title="Mural">
        <div className="flex flex-col gap-5">
          <Field
            name="bio"
            label="Descripción"
            errors={state.fieldErrors}
            hint="El texto que acompaña a su foto en el mural."
          >
            <Textarea rows={3} defaultValue={pet?.bio ?? ""} placeholder="Le pierde la playa…" />
          </Field>

          <Field
            name="avatarUrl"
            label="URL de la foto de perfil"
            errors={state.fieldErrors}
            hint="Opcional. También puedes subir fotos desde la pestaña Fotos y marcar una como portada."
          >
            <TextInput type="url" defaultValue={pet?.avatarUrl ?? ""} placeholder="https://…" />
          </Field>

          <Checkbox
            name="isPublic"
            label="Mostrar en el mural"
            defaultChecked={pet?.isPublic ?? true}
            hint="Las mascotas privadas sólo se ven en «Mis mascotas»."
          />
        </div>
      </Section>

      <div className="flex flex-col gap-3">
        <FormFeedback state={state} />
        <SubmitButton className="self-start">
          {pet ? "Guardar cambios" : "Crear ficha"}
        </SubmitButton>
      </div>
    </form>
  );
}
