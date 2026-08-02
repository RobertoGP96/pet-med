import Link from "next/link";

import { SignInForm } from "@/components/account/sign-in-form";
import { SetupNotice } from "@/components/setup-notice";
import { Eyebrow } from "@/components/ui/section";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Entrar",
  description: "Accede a las fichas de tus mascotas.",
};

export default async function SignInPage({ searchParams }: PageProps<"/acceso">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // En Next 16 `searchParams` es una promesa. Puede traer el mismo parámetro
  // repetido, y entonces llega como array: nos quedamos con el primero.
  const { siguiente, error } = await searchParams;
  const next = Array.isArray(siguiente) ? siguiente[0] : siguiente;
  const linkFailed = (Array.isArray(error) ? error[0] : error) === "enlace";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="brand">Pet Med</Eyebrow>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Entrar</h1>
        <p className="text-muted-foreground text-sm">
          El historial de tus mascotas, donde lo dejaste.
        </p>
      </div>

      {linkFailed && (
        <p
          role="alert"
          className="bg-health-alert/10 text-health-alert rounded-md px-3 py-2 text-sm"
        >
          Ese enlace ya no vale: puede que haya caducado o que ya lo hubieras usado. Entra con tu
          correo y tu contraseña.
        </p>
      )}

      <SignInForm next={next} />

      <p className="text-muted-foreground text-center text-sm">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/registro" className="text-brand font-extrabold hover:underline">
          Crear una
        </Link>
      </p>
    </div>
  );
}
