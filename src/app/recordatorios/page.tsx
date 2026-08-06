import { Plus } from "lucide-react";

import {
  ReminderComposer,
  type ReminderComposerPet,
} from "@/components/reminders/reminder-composer";
import { ReminderList } from "@/components/reminders/reminder-list";
import { SetupNotice } from "@/components/setup-notice";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, PageHeader, Section } from "@/components/ui/section";
import { isSupabaseConfigured } from "@/lib/env";
import { listMedicationsByPet, listPendingReminders, listPets } from "@/server/queries";

export const metadata = {
  title: "Recordatorios",
};

/** Datos siempre frescos: ver la nota en src/app/page.tsx. */
export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const [items, pets] = await Promise.all([listPendingReminders(), listPets()]);

  // El formulario ofrece los tratamientos de cada mascota para poder enlazar
  // el recordatorio con su medicamento. Una sola consulta para todas: antes
  // esto era un `getPetDossier` por mascota dentro del bucle, y cada uno leía
  // las siete tablas del historial para quedarse sólo con `medications`.
  const medicationsByPet = await listMedicationsByPet(pets.map((pet) => pet.id));

  const composerPets: ReminderComposerPet[] = pets.map((pet) => ({
    id: pet.id,
    name: pet.name,
    medications: medicationsByPet.get(pet.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Recordatorios"
        description="Vacunas, desparasitaciones, revisiones y tomas de medicación de todas tus mascotas."
      />

      {pets.length === 0 ? (
        <EmptyState
          icon={<Plus className="size-10" />}
          title="Primero crea una ficha"
          description="Los recordatorios se asocian siempre a una mascota."
          action={
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Añadir mascota
            </ActionLink>
          }
        />
      ) : (
        <>
          <ReminderList items={items} />

          <Section title="Nuevo recordatorio">
            <ReminderComposer pets={composerPets} />
          </Section>
        </>
      )}
    </div>
  );
}
