/**
 * Botones y enlaces de acción.
 *
 * Antes cada página repetía a mano la misma ristra de clases
 * (`bg-brand text-brand-foreground inline-flex h-10 …`), así que retematizar
 * obligaba a tocar seis archivos y a que uno se quedara distinto. Aquí están
 * las tres formas que usa el diseño y nada más:
 *
 * - `brand`   el rojo de señal, para la acción principal de la página.
 * - `ink`     tinta sobre papel, para la secundaria; al pasar el cursor se
 *             vuelve roja, que es el guiño del diseño original.
 * - `outline` sólo el contorno, para «cancelar» y «volver».
 * - `danger`  para borrar. Usa `--destructive`, un rojo más profundo que el de
 *             marca: en esta paleta el rojo de señal ya significa «mírame», y
 *             si borrar se pintara igual, la acción irreversible se
 *             confundiría con la recomendada.
 *
 * El tipo va en peso 800 y sin redondear apenas: es un rótulo, no una pastilla.
 */

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const actionStyles = cva(
  "focus-visible:ring-brand inline-flex items-center justify-center gap-2 rounded-md text-sm font-extrabold whitespace-nowrap transition focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        brand: "bg-brand text-brand-foreground hover:brightness-95",
        ink: "bg-primary text-primary-foreground hover:bg-brand hover:text-brand-foreground",
        outline: "border-border text-foreground hover:bg-accent border",
        danger: "text-destructive hover:bg-destructive/10",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  },
);

type ActionVariants = VariantProps<typeof actionStyles>;

export function ActionLink({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Link> & ActionVariants) {
  return <Link className={cn(actionStyles({ variant, size }), className)} {...props} />;
}

export function ActionButton({
  className,
  variant,
  size,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ActionVariants) {
  return (
    <button type={type} className={cn(actionStyles({ variant, size }), className)} {...props} />
  );
}
