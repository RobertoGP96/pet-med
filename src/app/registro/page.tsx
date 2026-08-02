import Link from "next/link";

import { SignUpForm } from "@/components/account/sign-up-form";
import { SetupNotice } from "@/components/setup-notice";
import { Eyebrow } from "@/components/ui/section";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Crear cuenta",
  description: "Guarda el historial médico de tus mascotas.",
};

export default function SignUpPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="brand">Pet Med</Eyebrow>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Crear cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Peso, padecimientos, medicación, vacunas y fotos. Todo en un sitio.
        </p>
      </div>

      <SignUpForm />

      <p className="text-muted-foreground text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/acceso" className="text-brand font-extrabold hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
