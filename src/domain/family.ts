/**
 * Parentesco entre mascotas.
 *
 * El servidor guarda sólo dos vínculos por mascota (`fatherId`, `motherId`);
 * todo lo demás —abuelos, hermanos, hijos, huecos por permisos— se deriva
 * aquí, con funciones puras que trabajan sobre los datos que la consulta pudo
 * ver. Quien no aparezca en los mapas es que la RLS lo dejó fuera.
 */

import type { Sex, Species } from "./enums";

/** Lo mínimo de una mascota para pintarla como miembro de la familia. */
export interface FamilyMember {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  avatarUrl: string | null;
  /** De la persona en sesión: decide si se enlaza a /mascotas o a /mural. */
  isOwn: boolean;
}

/** Los vínculos crudos de una mascota; lo único que necesita el recorrido de ancestros. */
export interface ParentLinks {
  fatherId: string | null;
  motherId: string | null;
}

/**
 * Una posición del árbol puede estar ocupada, vacía o tapada:
 * - `member`: la mascota existe y es visible.
 * - `unavailable`: hay vínculo, pero su dueño la retiró del mural.
 * - `unknown`: sin vínculo registrado.
 */
export type FamilyNode =
  | { kind: "member"; member: FamilyMember }
  | { kind: "unavailable" }
  | { kind: "unknown" };

export interface FamilyTree {
  self: FamilyMember;
  father: FamilyNode;
  mother: FamilyNode;
  paternalGrandfather: FamilyNode;
  paternalGrandmother: FamilyNode;
  maternalGrandfather: FamilyNode;
  maternalGrandmother: FamilyNode;
  /** Comparten padre o madre; sin duplicados aunque compartan a los dos. */
  siblings: FamilyMember[];
  /** Mascotas que tienen a ésta como padre o como madre. */
  children: FamilyMember[];
}

/** Traduce un vínculo en su nodo: sin vínculo, tapado por permisos, o visible. */
function resolveNode(
  linkId: string | null,
  membersById: Map<string, FamilyMember>,
): FamilyNode {
  if (!linkId) return { kind: "unknown" };
  const member = membersById.get(linkId);
  return member ? { kind: "member", member } : { kind: "unavailable" };
}

/**
 * Los abuelos de una rama sólo se conocen si el progenitor es visible: a
 * través de un hueco (`unavailable` o `unknown`) no se puede afirmar nada.
 */
function resolveGrandparents(
  parent: FamilyNode,
  linksById: Map<string, ParentLinks>,
  membersById: Map<string, FamilyMember>,
): [FamilyNode, FamilyNode] {
  if (parent.kind !== "member") return [{ kind: "unknown" }, { kind: "unknown" }];
  const links = linksById.get(parent.member.id);
  return [
    resolveNode(links?.fatherId ?? null, membersById),
    resolveNode(links?.motherId ?? null, membersById),
  ];
}

export function buildFamilyTree(input: {
  self: FamilyMember;
  links: ParentLinks;
  membersById: Map<string, FamilyMember>;
  linksById: Map<string, ParentLinks>;
  siblings: FamilyMember[];
  children: FamilyMember[];
}): FamilyTree {
  const { self, links, membersById, linksById } = input;

  const father = resolveNode(links.fatherId, membersById);
  const mother = resolveNode(links.motherId, membersById);
  const [paternalGrandfather, paternalGrandmother] = resolveGrandparents(
    father,
    linksById,
    membersById,
  );
  const [maternalGrandfather, maternalGrandmother] = resolveGrandparents(
    mother,
    linksById,
    membersById,
  );

  // La consulta de hermanos busca por padre Y por madre: quien comparta a los
  // dos llegaría repetido, y la propia mascota también encaja en el filtro.
  const siblings = dedupeMembers(input.siblings).filter((member) => member.id !== self.id);
  const children = dedupeMembers(input.children).filter((member) => member.id !== self.id);

  return {
    self,
    father,
    mother,
    paternalGrandfather,
    paternalGrandmother,
    maternalGrandfather,
    maternalGrandmother,
    siblings,
    children,
  };
}

function dedupeMembers(members: FamilyMember[]): FamilyMember[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });
}

/**
 * ¿Poner estos padres convertiría a la mascota en su propio ascendiente?
 *
 * Sube por los ancestros *conocidos* (los que aparecen en `linksById`); la
 * cadena se corta en cuanto llega a una mascota sin vínculos cargados. El
 * conjunto `visited` protege frente a bucles que ya existieran en los datos.
 */
export function createsCycle(
  petId: string,
  candidateParentIds: Array<string | null>,
  linksById: Map<string, ParentLinks>,
): boolean {
  const pending = candidateParentIds.filter((id): id is string => Boolean(id));
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === petId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const links = linksById.get(current);
    if (links?.fatherId) pending.push(links.fatherId);
    if (links?.motherId) pending.push(links.motherId);
  }

  return false;
}
