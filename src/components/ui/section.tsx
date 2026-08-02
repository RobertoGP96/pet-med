/**
 * Contenedores de página reutilizables: tarjeta de sección, cabecera y estado
 * vacío.
 *
 * Son las tres piezas por las que pasa toda la interfaz, así que aquí es donde
 * se nota el lenguaje «Mancha»: filete bajo el título de página, micro-etiqueta
 * en versalitas y esquinas apenas insinuadas. Los colores salen siempre de los
 * tokens de globals.css.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-border bg-card rounded-lg border p-5 sm:p-6", className)}>
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h2>}
            {description && <p className="text-muted-foreground text-xs">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Micro-etiqueta en versalitas. En el diseño va encima de cada dato y es lo que
 * ordena la lectura: primero el rótulo pequeño, después la cifra grande.
 */
export function Eyebrow({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "brand";
}) {
  return (
    <span
      className={cn(
        "eyebrow",
        tone === "brand" ? "text-brand" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow}
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{title}</h1>
        {description && <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      {icon && (
        <div className="text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-lg font-extrabold tracking-[-0.02em]">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
