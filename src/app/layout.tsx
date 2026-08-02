import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { displayNameOf, getSessionUser } from "@/lib/auth";
import "./globals.css";

/**
 * Archivo es la tipografía del diseño. Se carga la variable completa porque la
 * interfaz salta de 400 a 800 sin escalones intermedios y el peso alto es el
 * que sostiene la identidad.
 */
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pet Med · Historial médico de tus mascotas",
    template: "%s · Pet Med",
  },
  description:
    "Lleva el historial médico de tus mascotas: peso, padecimientos, medicación, vacunas, fotos y recordatorios, con indicadores de salud calculados a partir de lo que registras.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1918" },
  ],
};

/**
 * Aplica el tema guardado antes del primer pintado.
 *
 * Va como script en línea y bloqueante a propósito: si se ejecutara después de
 * la hidratación, quien tenga el modo oscuro vería un fogonazo blanco en cada
 * carga. Es el único `dangerouslySetInnerHTML` de la app y su contenido es una
 * constante, no entra nada de fuera.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("pet-med-theme") || "system";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored === "system" && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La sesión se lee aquí, en el servidor, y baja al armazón como datos planos.
  // `AppShell` es de cliente: no puede leer cookies por su cuenta, y tampoco
  // debería — el rol tiene que venir de un sitio en el que el navegador no
  // pueda escribir.
  const user = await getSessionUser();

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppShell
          account={
            user ? { name: displayNameOf(user), email: user.email, role: user.role } : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
