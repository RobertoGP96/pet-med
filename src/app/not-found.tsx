import { PawPrint } from "lucide-react";

import { ActionLink } from "@/components/ui/action";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <PawPrint className="text-brand/40 size-12" aria-hidden="true" />
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Aquí no hay nada</h1>
      <p className="text-muted-foreground max-w-sm">
        La página que buscas no existe, o la mascota que intentas ver se ha borrado.
      </p>
      <ActionLink href="/" className="mt-2">
        Volver al mural
      </ActionLink>
    </div>
  );
}
