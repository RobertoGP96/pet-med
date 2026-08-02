import Image from "next/image";
import Link from "next/link";
import { Camera, PawPrint, Plus, Star } from "lucide-react";

import { PetSectionHeader } from "@/components/pets/pet-section-header";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, Eyebrow, Section } from "@/components/ui/section";
import type { Photo } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { listPhotosByPet, type PetGroup } from "@/server/queries";

export const metadata = {
  title: "Fotos",
  description: "La galería de todas tus mascotas.",
};

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const groups = await listPhotosByPet();
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="border-border flex flex-col gap-3 border-b pb-5">
        <Eyebrow tone="brand">Álbum</Eyebrow>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Fotos</h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          {total > 0
            ? `${total} ${total === 1 ? "foto" : "fotos"} de ${groups.length} ${groups.length === 1 ? "mascota" : "mascotas"}. La de portada es la que sale en el mural.`
            : "Aquí se juntan las galerías de todas tus mascotas."}
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="size-10" />}
          title="Todavía no hay mascotas"
          description="Da de alta una mascota para empezar a subirle fotos."
          action={
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Añadir mascota
            </ActionLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <PetGallery key={group.pet.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function PetGallery({ group }: { group: PetGroup<Photo> }) {
  const { pet, items } = group;

  return (
    <Section className="flex flex-col gap-5">
      <PetSectionHeader
        pet={pet}
        href={`/mascotas/${pet.id}/fotos`}
        summary={
          items.length === 0
            ? "Sin fotos"
            : `${items.length} ${items.length === 1 ? "foto" : "fotos"}`
        }
      />

      {items.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center">
          <Camera className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            {pet.name} todavía no tiene ninguna foto.
          </p>
          <ActionLink href={`/mascotas/${pet.id}/fotos`} variant="outline" size="sm">
            <Plus className="size-4" />
            Subir la primera
          </ActionLink>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((photo) => (
            <li key={photo.id}>
              {/* Enlaza a la pestaña de fotos de la ficha, que es donde se
                  cambia la portada y se borra. Esta vista sólo mira. */}
              <Link
                href={`/mascotas/${pet.id}/fotos`}
                transitionTypes={["nav-forward"]}
                className="border-border bg-muted hover:border-brand focus-visible:ring-brand group relative block aspect-square overflow-hidden rounded-lg border transition focus-visible:ring-2 focus-visible:outline-none"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption ?? `${pet.name}, foto del ${formatDate(photo.takenAt)}`}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />

                {photo.isCover && (
                  <span className="eyebrow bg-brand text-brand-foreground absolute top-2 left-2 flex items-center gap-1 rounded px-2 py-1">
                    <Star className="size-3" aria-hidden="true" />
                    Portada
                  </span>
                )}

                {photo.caption && (
                  <span className="from-primary/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2 pt-6 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    <span className="line-clamp-2">{photo.caption}</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
