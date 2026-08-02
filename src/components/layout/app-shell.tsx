"use client";

/**
 * Armazón de la aplicación.
 *
 * Tres formas según el ancho, y ninguna depende de estado de JavaScript:
 *
 *   · móvil    barra superior fija con la marca y la cuenta, y navegación
 *              inferior al alcance del pulgar.
 *   · tablet   raíl vertical de iconos (md).
 *   · escrito. barra lateral completa con rótulos (lg).
 *
 * Antes esto era el `Sidebar` vendorizado de Aceternity, que se desplegaba al
 * pasar el cursor. Se ha sustituido por dos motivos: `src/components/ui/` se
 * sobrescribe al actualizar el registro (AGENTS.md), y una barra que sólo se
 * abre con el ratón deja fuera a quien navega con el teclado o toca la
 * pantalla. Aquí el ancho lo decide el punto de ruptura, no el puntero, así que
 * no hay nada que desplegar ni estado que sincronizar.
 *
 * Sigue siendo un componente de cliente por `usePathname`, que es lo que marca
 * el enlace activo. El contenido que llega por `children` se sigue pintando en
 * el servidor: pasar Server Components como `children` de un Client Component
 * no los convierte en cliente.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  Camera,
  Ellipsis,
  Images,
  LogOut,
  PawPrint,
  Plus,
  Scale,
  Shield,
  Syringe,
  X,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOutAction } from "@/server/actions";
import { cn } from "@/lib/utils";

/** Lo que el armazón necesita saber de quien ha iniciado sesión. */
export interface ShellAccount {
  name: string;
  email: string;
  role: "user" | "admin";
}

interface NavLink {
  label: string;
  /** Rótulo corto para la barra inferior, donde no caben dos palabras. */
  short: string;
  href: string;
  icon: typeof Images;
  /**
   * Si va en la barra inferior del móvil.
   *
   * En la barra lateral caben las seis secciones, pero abajo no: a partir de
   * cinco huecos cada uno baja de 70 px en un móvil estrecho y el rótulo deja
   * de leerse. Las que no son primarias viven en el desplegable «Más».
   */
  primary?: boolean;
}

const PUBLIC_LINKS: NavLink[] = [
  { label: "Mural", short: "Mural", href: "/", icon: Images, primary: true },
];

const PRIVATE_LINKS: NavLink[] = [
  { label: "Mis mascotas", short: "Mascotas", href: "/mascotas", icon: PawPrint, primary: true },
  { label: "Vacunas", short: "Vacunas", href: "/vacunas", icon: Syringe, primary: true },
  { label: "Peso", short: "Peso", href: "/peso", icon: Scale },
  { label: "Fotos", short: "Fotos", href: "/fotos", icon: Camera },
  {
    label: "Recordatorios",
    short: "Agenda",
    href: "/recordatorios",
    icon: CalendarClock,
    primary: true,
  },
];

const ADMIN_LINK: NavLink = {
  label: "Administración",
  short: "Admin",
  href: "/admin",
  icon: Shield,
};

/**
 * Lo que aparece y desaparece al plegar la barra: rótulos, nombre de la cuenta
 * y los dos botones del pie.
 *
 * Se oculta con opacidad y no con `display: none` para que la transición
 * acompañe al ancho en vez de dar un salto. Quedan en el árbol de accesibilidad
 * y en el orden de tabulación, lo cual es correcto: la barra se despliega
 * también con el foco, así que cuando el teclado llega a uno de ellos ya está
 * visible. El `overflow-hidden` de la barra impide que se puedan pulsar
 * mientras está plegada.
 */
const FADE_IN =
  "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100";

export function AppShell({
  children,
  account,
}: {
  children: React.ReactNode;
  /** null cuando no hay sesión: entonces no se pinta armazón (ver abajo). */
  account: ShellAccount | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  /*
   * Sin sesión no hay armazón de aplicación: ni barra lateral ni navegación
   * inferior, sólo una cabecera y el contenido a todo lo ancho.
   *
   * La razón es que a quien no ha entrado no le queda ninguna sección donde ir.
   * El único destino sería «Mural», que es la página en la que ya está, y las
   * demás llevan a /acceso. Una barra lateral con un solo enlace es un marco
   * vacío que roba sitio al contenido y sugiere secciones que no existen.
   */
  if (!account) {
    return (
      <div className="bg-background flex min-h-dvh w-full flex-col">
        <PublicHeader />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    );
  }

  // Ocultar los enlaces privados no es una medida de seguridad —el proxy y la
  // RLS son las que mandan—, es no ofrecer puertas que van a dar a /acceso.
  const links: NavLink[] = [
    ...PUBLIC_LINKS,
    ...PRIVATE_LINKS,
    ...(account.role === "admin" ? [ADMIN_LINK] : []),
  ];

  return (
    <div className="bg-background flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopBar account={account} />

      {/*
        La barra se pliega a raíl de iconos y se despliega al acercar el cursor.
        Tres detalles que la sostienen:

        · `group` + `hover:w-60`: el ancho lo lleva CSS, no estado de React. No
          hay nada que sincronizar ni que rehidratar, y la animación no pasa por
          el hilo de JavaScript.
        · `focus-within:w-60`: sin esto, quien navega con el tabulador enfocaría
          botones invisibles dentro de una barra de 80 px. Al abrirse también
          con el foco, el teclado recorre lo mismo que el ratón.
        · `self-start` impide que crezca con la página: en un contenedor flex en
          fila, `align-items: stretch` estira los hijos hasta la altura del más
          alto —el contenido—. Con `self-start` manda su propia `h-dvh`.

        `view-transition-name` la fija durante las navegaciones: el contenido se
        anima, la barra no se mueve. Ver globals.css.
      */}
      <aside
        style={{ viewTransitionName: "app-shell" }}
        className="border-border bg-card group sticky top-0 hidden h-dvh w-20 shrink-0 self-start overflow-hidden border-r transition-[width] duration-200 ease-out hover:w-60 focus-within:w-60 md:flex md:flex-col"
      >
        <div className="flex h-16 shrink-0 items-center px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Pet Med · ir al mural">
            <LogoMark decorative />
            {/* `whitespace-nowrap` es imprescindible: con la barra plegada a
                80 px el rótulo se partiría en dos líneas y estiraría la
                cabecera aunque esté invisible. */}
            <span
              className={cn(FADE_IN, "text-base font-extrabold tracking-[-0.02em] whitespace-nowrap")}
              aria-hidden="true"
            >
              PET&nbsp;MED
            </span>
          </Link>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 py-2"
          aria-label="Navegación principal"
        >
          {links.map((link) => (
            <SideLink key={link.href} link={link} active={isActive(link.href)} />
          ))}

          <Link
            href="/mascotas/nueva"
            className="text-brand hover:bg-accent mt-3 flex items-center gap-3 rounded-md px-3 py-2.5 font-extrabold transition"
            title="Añadir mascota"
          >
            <Plus className="size-5 shrink-0" aria-hidden="true" />
            <span className={cn(FADE_IN, "whitespace-nowrap")} aria-hidden="true">
              Añadir mascota
            </span>
            <span className="sr-only">Añadir mascota</span>
          </Link>
        </nav>

        <DesktopAccount account={account} />
      </aside>

      <main className="flex-1 overflow-x-hidden">
        {/* El relleno inferior en móvil deja sitio a la barra de navegación
            fija, que si no taparía el último elemento de cada página. */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:py-8 lg:px-8">
          {children}
        </div>
      </main>

      <MobileBottomNav links={links} isActive={isActive} />
    </div>
  );
}

/**
 * Enlace de la barra lateral.
 *
 * El icono queda siempre en la misma posición horizontal, plegada o desplegada:
 * lo que entra y sale es el rótulo. Así el desplegado no parece que empuje los
 * iconos, sólo que descubre el texto que había detrás.
 *
 * `title` da el nombre mientras está plegada, para el cursor.
 */
function SideLink({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      transitionTypes={["nav-forward"]}
      aria-current={active ? "page" : undefined}
      title={link.label}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2.5 transition",
        active
          ? // El filete rojo a la izquierda es la marca de «estás aquí» del
            // diseño, la misma que subraya la pestaña activa del expediente.
            "bg-accent before:bg-brand font-extrabold before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:content-['']"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <link.icon className={cn("size-5 shrink-0", active && "text-brand")} aria-hidden="true" />
      <span className={cn(FADE_IN, "whitespace-nowrap")} aria-hidden="true">
        {link.label}
      </span>
      {/* El nombre accesible va aparte: el rótulo visible se desvanece, pero un
          lector de pantalla tiene que leerlo siempre. */}
      <span className="sr-only">{link.label}</span>
    </Link>
  );
}

/**
 * Cabecera de las páginas públicas: mural, ficha pública, acceso y registro.
 *
 * Es la única navegación que ve quien no ha entrado, así que lleva las dos
 * puertas —entrar y crear cuenta— y nada más.
 */
function PublicHeader() {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Pet Med · ir al mural">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link
            href="/acceso"
            className="hover:bg-accent rounded-md px-3 py-2 text-sm font-extrabold transition"
          >
            Entrar
          </Link>
          {/* En pantallas estrechas sobra: quien no tiene cuenta llega igual
              desde el formulario de acceso, y dos botones seguidos a ese tamaño
              se comen la cabecera. */}
          <Link
            href="/registro"
            className="bg-brand text-brand-foreground hidden rounded-md px-3 py-2 text-sm font-extrabold transition hover:opacity-90 sm:inline-flex"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Pie de la barra lateral: quién eres, el tema y la salida, todo en una fila.
 *
 * El conmutador de tema vive aquí dentro y no suelto encima porque es una
 * preferencia de la cuenta, igual que cerrar sesión; agruparlos deja el pie en
 * una sola línea y devuelve ese alto a la navegación.
 *
 * Con la barra plegada sólo se ve el avatar. Los dos botones aparecen al
 * desplegarla —con el cursor o con el tabulador—, que es el mismo trato que
 * reciben los rótulos de los enlaces.
 */
function DesktopAccount({ account }: { account: ShellAccount }) {
  return (
    <div className="border-border shrink-0 border-t px-3 py-3">
      <div className="flex items-center gap-2">
        <Avatar name={account.name} />

        <span className={cn(FADE_IN, "flex min-w-0 flex-1 flex-col")}>
          <span className="truncate text-sm font-extrabold tracking-[-0.02em]">{account.name}</span>
          <span className="text-muted-foreground truncate text-xs">{account.email}</span>
        </span>

        <ThemeToggle compact className={cn(FADE_IN, "shrink-0")} />
        <SignOutButton className={cn(FADE_IN, "shrink-0")} />
      </div>
    </div>
  );
}

function MobileTopBar({ account }: { account: ShellAccount | null }) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label="Pet Med · ir al mural">
        <Logo />
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle compact />
        {account ? (
          <>
            <Avatar name={account.name} />
            <SignOutButton label="Cerrar sesión" />
          </>
        ) : (
          <Link
            href="/acceso"
            className="bg-brand text-brand-foreground eyebrow rounded-md px-3 py-2"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}

/**
 * Navegación inferior, sólo en móvil.
 *
 * Va abajo y no arriba porque es donde llega el pulgar. `env(safe-area-inset-
 * bottom)` reserva el hueco de la barra gestual de los iPhone: sin eso, el
 * último rótulo queda debajo del indicador de inicio.
 *
 * Cuatro secciones primarias y un «Más» con el resto. El desplegable se abre
 * hacia arriba, que es de donde viene el dedo, y se cierra al elegir o al tocar
 * fuera — de ahí el velo, que además apaga el contenido y deja claro que la
 * hoja es lo que manda mientras esté abierta.
 */
function MobileBottomNav({
  links,
  isActive,
}: {
  links: NavLink[];
  isActive: (href: string) => boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = links.filter((link) => link.primary);
  const rest = links.filter((link) => !link.primary);
  const moreActive = rest.some((link) => isActive(link.href));

  return (
    <>
      {moreOpen && (
        <div
          className="bg-primary/40 fixed inset-0 z-30 md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Navegación principal"
        className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {moreOpen && (
          <div className="border-border flex flex-col gap-1 border-b p-3">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="eyebrow text-muted-foreground">Más secciones</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            {rest.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 font-extrabold transition",
                  isActive(link.href) ? "bg-accent text-brand" : "hover:bg-accent",
                )}
              >
                <link.icon className="size-5 shrink-0" aria-hidden="true" />
                {link.label}
              </Link>
            ))}

            <Link
              href="/mascotas/nueva"
              onClick={() => setMoreOpen(false)}
              className="text-brand hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2.5 font-extrabold transition"
            >
              <Plus className="size-5 shrink-0" aria-hidden="true" />
              Añadir mascota
            </Link>
          </div>
        )}

        <div className="flex items-stretch">
          {primary.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition",
                  active
                    ? "text-brand after:bg-brand after:absolute after:inset-x-4 after:top-0 after:h-0.5 after:rounded-full after:content-['']"
                    : "text-muted-foreground",
                )}
              >
                <link.icon className="size-5" aria-hidden="true" />
                <span className="eyebrow">{link.short}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition",
              // Si la sección actual vive dentro del desplegable, el botón se
              // marca igual que un enlace activo: si no, estarías en «Peso» y
              // la barra no señalaría nada.
              moreOpen || moreActive
                ? "text-brand after:bg-brand after:absolute after:inset-x-4 after:top-0 after:h-0.5 after:rounded-full after:content-['']"
                : "text-muted-foreground",
            )}
          >
            <Ellipsis className="size-5" aria-hidden="true" />
            <span className="eyebrow">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}

/** Inicial sobre cuadrado de tinta. Sin foto de perfil: no hay dónde subirla. */
function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-sm text-xs font-extrabold uppercase"
    >
      {name.slice(0, 1)}
    </span>
  );
}

/**
 * Cerrar sesión va en un `<form>` y no en un enlace: cambia el estado del
 * servidor, y eso no se hace con un GET que cualquier precargador del navegador
 * pueda disparar por su cuenta.
 */
function SignOutButton({
  children,
  label = "Cerrar sesión",
  className,
}: {
  children?: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <form action={signOutAction} className="contents">
      <button
        type="submit"
        title={label}
        className={cn(
          "text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm transition",
          className,
        )}
      >
        <LogOut className="size-5 shrink-0" aria-hidden="true" />
        {children ?? <span className="sr-only">{label}</span>}
      </button>
    </form>
  );
}
