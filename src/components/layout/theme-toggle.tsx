"use client";

/**
 * Conmutador de tema claro/oscuro.
 *
 * La preferencia vive en localStorage, que es un almacén *externo* a React, y
 * por eso se lee con `useSyncExternalStore` en vez de copiarla a estado desde
 * un efecto: así no hay render en cascada, la pestaña se entera si cambias el
 * tema en otra, y el render de servidor tiene una respuesta definida.
 *
 * Quien aplica la clase `dark` en el primer pintado es el script en línea de
 * `src/app/layout.tsx`; aquí sólo se mantiene sincronizada a partir de ahí.
 */

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "pet-med-theme";

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // `storage` sólo se dispara en las *otras* pestañas; los cambios propios los
  // anuncia `emitChange`.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

/** En el servidor no hay preferencia guardada: se asume la del sistema. */
function getServerSnapshot(): Theme {
  return "system";
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeToggle({
  collapsed,
  /**
   * Un único botón que rota claro → oscuro → sistema en vez del grupo de tres.
   * Es lo que se usa en la barra superior del móvil, donde no hay sitio para
   * tres controles junto al avatar y la salida.
   */
  compact,
  className,
}: {
  collapsed?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Efecto legítimo: sincroniza un sistema externo (la clase del <html>) con
  // el estado de React. No llama a setState.
  useEffect(() => {
    applyTheme(theme);

    // Con "sistema" hay que seguir escuchando: se puede cambiar el tema del
    // sistema operativo con la pestaña abierta.
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function selectTheme(next: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Modo privado o almacenamiento lleno: el tema se aplica igual, sólo
      // que no se recuerda.
    }
    emitChange();
  }

  if (compact) {
    const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
    const Icon = current.icon;

    return (
      <button
        type="button"
        onClick={() => selectTheme(next.value)}
        // El rótulo dice qué pasará al pulsar, no en qué estado está: es un
        // botón de acción, no un interruptor con dos posiciones.
        aria-label={`Tema: ${current.label}. Cambiar a ${next.label.toLowerCase()}`}
        title={`Tema: ${current.label}`}
        className={cn(
          "text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 place-items-center rounded-md transition",
          className,
        )}
      >
        <Icon className="size-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "border-border flex gap-1 rounded-lg border p-1",
        collapsed && "flex-col",
        className,
      )}
      role="group"
      aria-label="Tema de la interfaz"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => selectTheme(option.value)}
          aria-pressed={theme === option.value}
          aria-label={option.label}
          title={option.label}
          className={cn(
            "grid size-7 place-items-center rounded-md transition",
            theme === option.value
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <option.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
