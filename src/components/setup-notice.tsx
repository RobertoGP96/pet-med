/**
 * Pantalla de configuración pendiente.
 *
 * Sin credenciales de Supabase la app no puede leer nada. En vez de reventar
 * con un error de conexión, cada página comprueba `isSupabaseConfigured()` y
 * muestra esto, que explica exactamente qué falta y en qué orden hacerlo.
 */

import { Database, FileCode2, KeyRound, Terminal } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "Crea un proyecto en Supabase",
    body: "Entra en supabase.com, crea un proyecto y espera a que termine de aprovisionarse.",
  },
  {
    icon: FileCode2,
    title: "Aplica el esquema",
    body: "Copia el contenido de supabase/migrations/20260801120000_init.sql en el SQL Editor y ejecútalo. Después, si quieres datos de ejemplo, haz lo mismo con supabase/seed.sql.",
  },
  {
    icon: KeyRound,
    title: "Copia las claves",
    body: "En Project Settings → API encontrarás la URL del proyecto, la clave pública (publishable) y la secreta (service_role).",
  },
  {
    icon: Terminal,
    title: "Rellena .env.local",
    body: "Copia .env.example a .env.local, pega los tres valores y reinicia el servidor de desarrollo.",
  },
];

export function SetupNotice() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Falta conectar la base de datos</h1>
        <p className="text-muted-foreground">
          Pet Med guarda el historial en Supabase. Son cuatro pasos y se hace una sola vez.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="border-border bg-card flex gap-4 rounded-xl border p-4"
          >
            <span className="bg-brand/10 text-brand grid size-9 shrink-0 place-items-center rounded-lg">
              <step.icon className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                {index + 1}. {step.title}
              </p>
              <p className="text-muted-foreground text-sm">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground text-sm">
        Las instrucciones completas están en el <code className="font-mono">README.md</code>.
      </p>
    </div>
  );
}
