/**
 * Logotipo de Pet Med.
 *
 * La marca es la huella sola, en rojo y sin fondo: se apoya en el papel de la
 * página en vez de traer su propia caja. El rótulo va en la tinta del contexto,
 * así que el conjunto sigue siendo papel + tinta + rojo sin necesidad de
 * condicionales para el modo oscuro.
 *
 * La huella es la `PawPrint` de lucide, la misma librería con la que están
 * dibujados todos los iconos de la aplicación. Se probó con una huella propia y
 * quedaba fuera de sitio: lucide traza a línea y con grosor constante, así que
 * una silueta maciza al lado de cualquier otro icono cantaba. La marca gana más
 * siendo coherente con el resto de la interfaz que siendo distinta.
 *
 * `LogoMark` es sólo el símbolo (avatar, pantallas estrechas).
 * `Logo` es el bloque completo con el rótulo.
 */

import { PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  /**
   * Deja la huella fuera del árbol de accesibilidad. Es lo que se usa cuando va
   * acompañada del rótulo: si no, un lector de pantalla diría «Pet Med» dos
   * veces seguidas, una por el símbolo y otra por el texto.
   */
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <PawPrint
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Pet Med"}
      // `strokeWidth` por encima del 2 de lucide: sin la caja roja detrás, la
      // huella tiene que sostenerse sola y el trazo por defecto la dejaba
      // demasiado ligera al lado del rótulo en peso 800.
      strokeWidth={2.25}
      className={cn("text-brand size-7 shrink-0", className)}
    />
  );
}

export function Logo({
  className,
  /** Oculta el rótulo dejando sólo el símbolo. */
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark decorative={!markOnly} />
      {!markOnly && (
        <span className="text-base font-extrabold tracking-[-0.02em] whitespace-pre">
          PET&nbsp;MED
        </span>
      )}
    </span>
  );
}
