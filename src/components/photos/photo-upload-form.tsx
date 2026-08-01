"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";

import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { ACCEPTED_IMAGE_TYPES } from "@/domain/schemas";
import { idleState } from "@/lib/action-result";
import { uploadPhotoAction } from "@/server/actions";

/**
 * Subida de foto.
 *
 * Usa un `<input type="file">` nativo a propósito: un archivo sólo llega al
 * servidor si el propio input está dentro del formulario, así que los
 * componentes de arrastrar y soltar que guardan el archivo en estado de React
 * no sirven aquí sin trabajo extra.
 */
export function PhotoUploadForm({ petId }: { petId: string }) {
  const [state, formAction] = useActionState(uploadPhotoAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="petId" value={petId} />

      <Field
        name="file"
        label="Imagen"
        required
        errors={state.fieldErrors}
        hint="JPEG, PNG, WebP o AVIF. Máximo 5 MB."
      >
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="file:bg-brand file:text-brand-foreground text-muted-foreground w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:opacity-90"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="caption" label="Pie de foto" errors={state.fieldErrors}>
          <Textarea rows={2} placeholder="Primer baño del verano" />
        </Field>

        <Field name="takenAt" label="Fecha de la foto" errors={state.fieldErrors}>
          <Input type="date" />
        </Field>
      </div>

      <Checkbox
        name="isCover"
        label="Usar como portada"
        hint="Es la foto que representa a la mascota en el mural."
      />

      <FormFeedback state={state} />

      <SubmitButton className="self-start" pendingLabel="Subiendo…">
        <ImagePlus className="size-4" />
        Subir foto
      </SubmitButton>
    </form>
  );
}
