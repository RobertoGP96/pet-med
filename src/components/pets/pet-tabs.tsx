"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, HeartPulse, LayoutDashboard, Pill, Scale, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pestañas de la ficha, implementadas como enlaces reales y no como estado.
 *
 * Cada pestaña es su propia URL: se puede compartir, recargar y navegar con
 * atrás. Además cada una carga sólo sus datos en lugar de traerlo todo.
 *
 * La activa se marca como un rótulo en negativo —tinta llena con un filete rojo
 * debajo—, no como una píldora: el diseño no redondea las pestañas.
 */
const TABS = [
  { segment: "", label: "Resumen", icon: LayoutDashboard },
  { segment: "peso", label: "Peso", icon: Scale },
  { segment: "padecimientos", label: "Padecimientos", icon: HeartPulse },
  { segment: "medicamentos", label: "Medicamentos", icon: Pill },
  { segment: "historia", label: "Historia clínica", icon: Stethoscope },
  { segment: "fotos", label: "Fotos", icon: Camera },
];

export function PetTabs({ petId }: { petId: string }) {
  const pathname = usePathname();
  const base = `/mascotas/${petId}`;

  return (
    <nav
      aria-label="Secciones de la ficha"
      className="border-border -mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-px"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = pathname === href;

        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition",
              active
                ? "border-brand bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            <tab.icon className="size-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
