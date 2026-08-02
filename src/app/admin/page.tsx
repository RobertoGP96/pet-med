import Image from "next/image";
import Link from "next/link";
import { EyeOff, Lock, PawPrint, Star } from "lucide-react";

import { MuralModeration } from "@/components/admin/mural-moderation";
import { PetAvatar } from "@/components/pets/pet-avatar";
import { EmptyState, Eyebrow } from "@/components/ui/section";
import { SPECIES_LABELS } from "@/domain/enums";
import { formatDate } from "@/lib/format";
import { listPetsForAdmin, type AdminPet } from "@/server/queries";

export const metadata = {
  title: "Mural",
  description: "Moderación de lo que se ve en el mural.",
};

export const dynamic = "force-dynamic";

export default async function AdminMuralPage() {
  const pets = await listPetsForAdmin();

  const visible = pets.filter((pet) => pet.isPublic && !pet.hiddenByAdmin);
  const featured = visible.filter((pet) => pet.featured);
  const hidden = pets.filter((pet) => pet.hiddenByAdmin);
  const priv = pets.filter((pet) => !pet.isPublic && !pet.hiddenByAdmin);

  return (
    <div className="flex flex-col gap-8">
      <dl className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
        <Stat value={pets.length} label="Mascotas en total" />
        <Stat value={visible.length} label="Visibles en el mural" />
        <Stat value={featured.length} label="Destacadas" />
        <Stat value={hidden.length} label="Retiradas" />
      </dl>

      <p className="text-muted-foreground text-sm text-pretty">
        Destacar sube una mascota al principio del mural; volver a destacar una ya destacada la
        vuelve a subir. Retirar la saca del mural sin tocar lo que decidió su dueño.
        {priv.length > 0 &&
          ` ${priv.length} ${priv.length === 1 ? "mascota está" : "mascotas están"} en privado por decisión de su dueño: eso no se puede revertir desde aquí.`}
      </p>

      {pets.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="size-10" />}
          title="Todavía no hay mascotas"
          description="Cuando alguien dé de alta una mascota aparecerá aquí para poder moderarla."
        />
      ) : (
        <ul className="flex list-none flex-col gap-3">
          {pets.map((pet) => (
            <li key={pet.id}>
              <AdminPetRow pet={pet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-card flex flex-col gap-1.5 px-4 py-4">
      <dd className="text-3xl leading-none font-extrabold tracking-[-0.02em] tabular-nums">
        {value}
      </dd>
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
    </div>
  );
}

function AdminPetRow({ pet }: { pet: AdminPet }) {
  const photo = pet.coverPhotoUrl ?? pet.avatarUrl;

  return (
    <article className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {photo ? (
          <Image
            src={photo}
            alt={pet.name}
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <PetAvatar name={pet.name} species={pet.species} url={null} size={56} />
        )}

        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/mural/${pet.id}`}
              className="hover:text-brand truncate font-extrabold tracking-[-0.02em] transition"
            >
              {pet.name}
            </Link>

            {pet.featured && !pet.hiddenByAdmin && (
              <Badge tone="brand" icon={<Star className="size-3" />}>
                Destacada
              </Badge>
            )}
            {pet.hiddenByAdmin && (
              <Badge tone="alert" icon={<EyeOff className="size-3" />}>
                Retirada
              </Badge>
            )}
            {!pet.isPublic && (
              <Badge tone="muted" icon={<Lock className="size-3" />}>
                Privada por su dueño
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground truncate text-xs">
            {SPECIES_LABELS[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""} · alta el {formatDate(pet.createdAt.slice(0, 10))}
          </p>

          <p className="text-muted-foreground truncate text-xs">
            {pet.ownerEmail ?? pet.ownerName ?? "Sin dueño registrado (dato de ejemplo)"}
          </p>
        </div>
      </div>

      <div className="shrink-0 sm:text-right">
        <MuralModeration petId={pet.id} featured={pet.featured} hidden={pet.hiddenByAdmin} />
      </div>
    </article>
  );
}

function Badge({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone: "brand" | "alert" | "muted";
}) {
  const styles = {
    brand: "bg-brand text-brand-foreground",
    alert: "bg-health-alert/10 text-health-alert",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <span className={`eyebrow flex shrink-0 items-center gap-1 rounded px-2 py-0.5 ${styles}`}>
      {icon}
      {children}
    </span>
  );
}
