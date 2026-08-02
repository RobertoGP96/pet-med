import Link from "next/link";

import { Eyebrow } from "@/components/ui/section";
import { requireAdmin } from "@/lib/auth";

export const metadata = {
  title: "Administración",
};

const TABS = [
  { label: "Mural", href: "/admin" },
  { label: "Cuentas", href: "/admin/usuarios" },
];

/**
 * Armazón del panel de administración.
 *
 * `requireAdmin()` aquí cubre todo lo que cuelgue de /admin, presente y futuro:
 * un layout se ejecuta antes que la página de cualquier ruta hija, así que
 * añadir una sección nueva no puede olvidarse de comprobar el rol.
 *
 * No es la única barrera —cada consulta y cada acción lo vuelven a exigir, y la
 * RLS por debajo—, pero es la que evita que alguien llegue a ver el marco.
 * Devuelve 404 y no 403 a propósito: un 403 confirmaría que /admin existe.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="brand">Sólo administradores</Eyebrow>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Administración</h1>
        </div>

        <nav className="border-border flex gap-1 border-b" aria-label="Secciones del panel">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="hover:text-foreground text-muted-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-extrabold transition hover:border-current"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
