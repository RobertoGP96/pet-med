import { notFound } from "next/navigation";

import { PhotoGallery } from "@/components/photos/photo-gallery";
import { PhotoUploadForm } from "@/components/photos/photo-upload-form";
import { Section } from "@/components/ui/section";
import { getPetPhotos } from "@/server/queries";

export const metadata = { title: "Fotos" };

export default async function PetPhotosPage({ params }: PageProps<"/mascotas/[petId]/fotos">) {
  const { petId } = await params;
  const result = await getPetPhotos(petId);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section title="Subir una foto">
        <PhotoUploadForm petId={petId} />
      </Section>

      <PhotoGallery photos={result.data} petId={petId} />
    </div>
  );
}
