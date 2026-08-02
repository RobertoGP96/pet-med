import { Shield, Users } from "lucide-react";

import { RoleSwitch } from "@/components/admin/role-switch";
import { EmptyState, Eyebrow } from "@/components/ui/section";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listProfilesForAdmin } from "@/server/queries";

export const metadata = {
  title: "Cuentas",
  description: "Las personas registradas y sus roles.",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // El layout ya lo exige; aquí hace falta el objeto para saber cuál de las
  // filas eres tú y no ofrecerte degradarte a ti mismo.
  const admin = await requireAdmin();
  const profiles = await listProfilesForAdmin();

  const admins = profiles.filter((profile) => profile.role === "admin").length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm text-pretty">
        {profiles.length} {profiles.length === 1 ? "cuenta registrada" : "cuentas registradas"},{" "}
        {admins} con permisos de administración. Un administrador modera el mural y cambia roles,
        pero <strong className="text-foreground font-extrabold">no</strong> ve el historial médico
        de mascotas ajenas: eso lo impide la base de datos, no la interfaz.
      </p>

      {profiles.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="Todavía no hay cuentas"
          description="Aquí aparecerán las personas que se registren."
        />
      ) : (
        <ul className="bg-border border-border grid list-none gap-px overflow-hidden rounded-lg border">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="bg-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-sm text-sm font-extrabold uppercase">
                {(profile.displayName ?? profile.email ?? "?").slice(0, 1)}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-extrabold tracking-[-0.02em]">
                    {profile.displayName ?? "Sin nombre"}
                  </span>
                  {profile.role === "admin" && (
                    <span className="eyebrow bg-brand text-brand-foreground flex shrink-0 items-center gap-1 rounded px-2 py-0.5">
                      <Shield className="size-3" aria-hidden="true" />
                      Admin
                    </span>
                  )}
                </div>

                <span className="text-muted-foreground truncate text-xs">
                  {profile.email ?? "Sin correo"}
                </span>

                <span className="text-muted-foreground text-xs">
                  {profile.petsCount === 0
                    ? "Sin mascotas"
                    : `${profile.petsCount} ${profile.petsCount === 1 ? "mascota" : "mascotas"}`}{" "}
                  · desde el {formatDate(profile.createdAt.slice(0, 10))}
                </span>
              </div>

              <div className="shrink-0">
                <RoleSwitch
                  userId={profile.id}
                  name={profile.displayName ?? profile.email ?? "esta cuenta"}
                  role={profile.role}
                  isSelf={profile.id === admin.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-border rounded-lg border border-dashed px-4 py-3">
        <Eyebrow>Si te quedas sin administradores</Eyebrow>
        <p className="text-muted-foreground mt-1 text-xs text-pretty">
          No puedes quitarte el rol a ti mismo, así que siempre queda al menos uno. Si aun así
          hiciera falta recuperarlo, se hace desde el SQL Editor de Supabase con un{" "}
          <code className="font-mono">update profiles set role = &apos;admin&apos;</code>.
        </p>
      </div>
    </div>
  );
}
