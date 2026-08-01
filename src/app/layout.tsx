import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const geistSans = Geist({
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
