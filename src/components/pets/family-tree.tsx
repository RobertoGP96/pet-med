import Link from "next/link";

import { PetAvatar } from "@/components/pets/pet-avatar";
import { Eyebrow } from "@/components/ui/section";
import type { FamilyMember, FamilyNode, FamilyTree } from "@/domain/family";
import { cn } from "@/lib/utils";

/**
 * Árbol genealógico de la ficha: abuelos, padres y la propia mascota, en tres
 * filas de tarjetas unidas por un hilo vertical. Sin SVG ni librerías: con
 * tres niveles fijos, una rejilla lo dibuja igual de bien y se mantiene sola.
 */
export function FamilyTreeView({ tree }: { tree: FamilyTree }) {
  const grandparents = [
    { node: tree.paternalGrandfather, relation: "Abuelo paterno" },
    { node: tree.paternalGrandmother, relation: "Abuela paterna" },
    { node: tree.maternalGrandfather, relation: "Abuelo materno" },
    { node: tree.maternalGrandmother, relation: "Abuela materna" },
  ];
  // Cuatro tarjetas de «Sin registrar» no cuentan nada: la fila de abuelos
  // sólo aparece cuando al menos uno existe o está tapado por permisos.
  const hasGrandparents = grandparents.some(({ node }) => node.kind !== "unknown");

  return (
    <div className="flex flex-col gap-3">
      {hasGrandparents && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {grandparents.map(({ node, relation }) => (
              <FamilyMemberCard key={relation} node={node} relation={relation} />
            ))}
          </div>
          <Connector />
        </>
      )}

      <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3">
        <FamilyMemberCard node={tree.father} relation="Padre" />
        <FamilyMemberCard node={tree.mother} relation="Madre" />
      </div>

      <Connector />

      <div className="mx-auto w-full max-w-56">
        <FamilyMemberCard node={{ kind: "member", member: tree.self }} highlight />
      </div>
    </div>
  );
}

/** Hermanos o hijos: las mismas tarjetas, en lista horizontal enlazable. */
export function FamilyMemberList({ members }: { members: FamilyMember[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.id}>
          <Link
            href={memberHref(member)}
            className="group border-border hover:border-brand flex items-center gap-3 rounded-lg border p-3 transition"
          >
            <PetAvatar name={member.name} species={member.species} url={member.avatarUrl} size={44} />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{member.name}</span>
              {!member.isOwn && <span className="text-muted-foreground text-xs">En el mural</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** La ficha completa si es tuya; la del mural si es de otra persona. */
function memberHref(member: FamilyMember): string {
  return member.isOwn ? `/mascotas/${member.id}` : `/mural/${member.id}`;
}

/** Hilo vertical entre generaciones. En móvil las filas se apilan y basta el hueco. */
function Connector() {
  return <div aria-hidden="true" className="bg-border mx-auto hidden h-5 w-px sm:block" />;
}

/**
 * Una posición del árbol. Las tres variantes comparten silueta para que la
 * rejilla no baile: mascota enlazable, hueco por permisos («No disponible») o
 * vínculo sin registrar.
 */
function FamilyMemberCard({
  node,
  relation,
  highlight = false,
}: {
  node: FamilyNode;
  relation?: string;
  highlight?: boolean;
}) {
  const base = "flex h-full flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center";

  if (node.kind === "member") {
    const { member } = node;
    return (
      <Link
        href={memberHref(member)}
        className={cn(
          base,
          "group bg-card hover:border-brand transition",
          highlight ? "border-brand" : "border-border",
        )}
      >
        {relation && <Eyebrow>{relation}</Eyebrow>}
        <PetAvatar name={member.name} species={member.species} url={member.avatarUrl} size={56} />
        <span className="text-sm font-bold">{member.name}</span>
        {!member.isOwn && <span className="text-muted-foreground text-xs">En el mural</span>}
      </Link>
    );
  }

  if (node.kind === "unavailable") {
    return (
      <div className={cn(base, "border-border bg-muted")}>
        {relation && <Eyebrow>{relation}</Eyebrow>}
        <span className="text-muted-foreground text-sm font-bold">No disponible</span>
        <span className="text-muted-foreground text-xs">Su dueño la retiró del mural.</span>
      </div>
    );
  }

  return (
    <div className={cn(base, "border-border border-dashed")}>
      {relation && <Eyebrow>{relation}</Eyebrow>}
      <span className="text-muted-foreground text-sm">Sin registrar</span>
    </div>
  );
}
