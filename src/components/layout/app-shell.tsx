"use client";

/**
 * Armazón de la aplicación: barra lateral plegable + área de contenido.
 *
 * Es un componente de cliente porque la barra lateral guarda su estado de
 * apertura y resalta la ruta activa. El contenido que recibe por `children`
 * sigue siendo renderizado en el servidor: pasar Server Components como
 * `children` de un Client Component no los convierte en cliente.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Images, PawPrint, Plus } from "lucide-react";
import { motion } from "motion/react";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Mural", href: "/", icon: Images },
  { label: "Mis mascotas", href: "/mascotas", icon: PawPrint },
  { label: "Recordatorios", href: "/recordatorios", icon: CalendarClock },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="bg-background flex min-h-dvh w-full flex-col md:flex-row">
      {/* `view-transition-name` fija la barra durante las navegaciones: el
          contenido se anima, el armazón no se mueve. Ver globals.css. */}
      <div style={{ viewTransitionName: "app-shell" }}>
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              <Brand open={open} />

              <nav className="mt-8 flex flex-col gap-1" aria-label="Navegación principal">
                {NAV_LINKS.map((link) => (
                  <SidebarLink
                    key={link.href}
                    link={{
                      label: link.label,
                      href: link.href,
                      icon: (
                        <link.icon
                          className={cn(
                            "size-5 shrink-0",
                            isActive(link.href)
                              ? "text-brand"
                              : "text-neutral-700 dark:text-neutral-200",
                          )}
                        />
                      ),
                    }}
                    className={cn(
                      "rounded-md px-2 py-1.5 transition",
                      isActive(link.href) && "bg-brand/10 font-medium",
                    )}
                  />
                ))}
              </nav>

              <div className="mt-6">
                <SidebarLink
                  link={{
                    label: "Añadir mascota",
                    href: "/mascotas/nueva",
                    icon: <Plus className="text-brand size-5 shrink-0" />,
                  }}
                  className="rounded-md px-2 py-1.5"
                />
              </div>
            </div>

            <ThemeToggle collapsed={!open} />
          </SidebarBody>
        </Sidebar>
      </div>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function Brand({ open }: { open: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 py-1">
      <span className="bg-brand text-brand-foreground grid size-7 shrink-0 place-items-center rounded-lg">
        <PawPrint className="size-4" />
      </span>
      <motion.span
        animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
        className="font-semibold whitespace-pre"
      >
        Pet Med
      </motion.span>
    </Link>
  );
}
