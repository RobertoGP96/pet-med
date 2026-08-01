"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Star, Trash2 } from "lucide-react";

import { DangerButton } from "@/components/ui/form-feedback";
import { EmptyState } from "@/components/ui/section";
import type { Photo } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { idleState } from "@/lib/action-result";
import { deletePhotoAction, setCoverPhotoAction } from "@/server/actions";

export function PhotoGallery({ photos, petId }: { photos: Photo[]; petId: string }) {
  if (photos.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay fotos"
        description="Sube la primera y márcala como portada para que aparezca en el mural."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="border-border bg-card group relative overflow-hidden rounded-xl border"
        >
          <div className="bg-muted relative aspect-square">
            <Image
              src={photo.url}
              alt={photo.caption ?? "Foto de la mascota"}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
            {photo.isCover && (
              <span className="bg-brand text-brand-foreground absolute top-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
                <Star className="size-3" aria-hidden="true" />
                Portada
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 p-3">
            {photo.caption && <p className="text-sm">{photo.caption}</p>}
            {photo.takenAt && (
              <p className="text-muted-foreground text-xs">{formatDate(photo.takenAt)}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              {!photo.isCover && <SetCoverButton photoId={photo.id} petId={petId} />}
              <DeletePhotoButton photoId={photo.id} petId={petId} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SetCoverButton({ photoId, petId }: { photoId: string; petId: string }) {
  const [, formAction] = useActionState(setCoverPhotoAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={photoId} />
      <input type="hidden" name="petId" value={petId} />
      <button
        type="submit"
        className="text-muted-foreground hover:text-brand inline-flex items-center gap-1.5 text-xs transition"
      >
        <Star className="size-3.5" aria-hidden="true" />
        Hacer portada
      </button>
    </form>
  );
}

function DeletePhotoButton({ photoId, petId }: { photoId: string; petId: string }) {
  const [, formAction] = useActionState(deletePhotoAction, idleState);

  return (
    <form action={formAction} className="ml-auto">
      <input type="hidden" name="id" value={photoId} />
      <input type="hidden" name="petId" value={petId} />
      <DangerButton confirmMessage="¿Seguro que quieres borrar esta foto? No se puede deshacer.">
        <Trash2 className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Borrar foto</span>
      </DangerButton>
    </form>
  );
}
