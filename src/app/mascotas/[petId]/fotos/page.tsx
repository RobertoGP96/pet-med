import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photos/photo-gallery";
import { PhotoUploadForm } from "@/components/photos/photo-upload-form";
import { Section } from "@/components/ui/section";
import { getPetDossier } from "@/server/queries";

export const metadata = { title: "Fotos" };

export default async function PetPhotosPage({ params }: PageProps<"/mascotas/[petId]/fotos">) {
  const { petId } = await params;
  const dossier = await getPetDossier(petId);
  if (!dossier) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section title="Subir una foto">
        <PhotoUploadForm petId={petId} />
      </Section>

      <PhotoGallery photos={dossier.photos} petId={petId} />
    </div>
  );
}
