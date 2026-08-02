"use client";

/**
 * Etiqueta de formulario sobre Radix, que es quien resuelve el `htmlFor` y el
 * foco al pulsar sobre el texto.
 *
 * Llegó del registro de Aceternity y traía `text-black dark:text-white`
 * literales. Ahora que `src/components/ui/` ya no es código vendorizado, el
 * color sale del token `foreground` como en el resto de la interfaz: así el
 * modo oscuro no depende de una variante que haya que recordar mantener.
 */

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
