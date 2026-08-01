import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <PawPrint className="text-brand/40 size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Aquí no hay nada</h1>
      <p className="text-muted-foreground max-w-sm">
        La página que buscas no existe, o la mascota que intentas ver se ha borrado.
      </p>
      <Link
        href="/"
        className="bg-brand text-brand-foreground mt-2 inline-flex h-10 items-center rounded-md px-4 text-sm font-medium transition hover:opacity-90"
      >
        Volver al mural
      </Link>
    </div>
  );
}
