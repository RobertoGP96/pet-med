import { describe, expect, it } from "vitest";

import {
  buildFamilyTree,
  createsCycle,
  type FamilyMember,
  type ParentLinks,
} from "./family";

/** Miembro de prueba con lo mínimo; cada test ajusta lo que le importa. */
function member(id: string, overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id,
    name: `Mascota ${id}`,
    species: "dog",
    sex: "unknown",
    avatarUrl: null,
    isOwn: true,
    ...overrides,
  };
}

function links(fatherId: string | null = null, motherId: string | null = null): ParentLinks {
  return { fatherId, motherId };
}

describe("createsCycle", () => {
  it("detecta el ciclo directo: la mascota como su propio padre", () => {
    expect(createsCycle("a", ["a"], new Map())).toBe(true);
  });

  it("detecta el ciclo de dos generaciones", () => {
    // b ya es hija de a; poner a b como madre de a cerraría el círculo.
    const linksById = new Map([["b", links("a", null)]]);
    expect(createsCycle("a", [null, "b"], linksById)).toBe(true);
  });

  it("detecta el ciclo a través de una cadena larga", () => {
    const linksById = new Map([
      ["d", links("c", null)],
      ["c", links(null, "b")],
      ["b", links("a", null)],
    ]);
    expect(createsCycle("a", ["d"], linksById)).toBe(true);
  });

  it("no señala ciclo cuando la cadena de ancestros se corta en un desconocido", () => {
    // De "c" no hay vínculos cargados: ahí acaba el recorrido.
    const linksById = new Map([["d", links("c", null)]]);
    expect(createsCycle("a", ["d"], linksById)).toBe(false);
  });

  it("no se cuelga aunque los datos ya contengan un bucle", () => {
    const linksById = new Map([
      ["b", links("c", null)],
      ["c", links("b", null)],
    ]);
    expect(createsCycle("a", ["b"], linksById)).toBe(false);
  });

  it("acepta padres sin registrar", () => {
    expect(createsCycle("a", [null, null], new Map())).toBe(false);
  });
});

describe("buildFamilyTree", () => {
  const self = member("yo");

  it("marca como no disponible al progenitor enlazado pero invisible", () => {
    const tree = buildFamilyTree({
      self,
      links: links("padre-invisible", null),
      membersById: new Map(),
      linksById: new Map(),
      siblings: [],
      children: [],
    });

    expect(tree.father).toEqual({ kind: "unavailable" });
    expect(tree.mother).toEqual({ kind: "unknown" });
  });

  it("resuelve padres y abuelos visibles", () => {
    const padre = member("padre", { sex: "male" });
    const abuela = member("abuela", { sex: "female" });
    const tree = buildFamilyTree({
      self,
      links: links("padre", null),
      membersById: new Map([
        ["padre", padre],
        ["abuela", abuela],
      ]),
      linksById: new Map([["padre", links(null, "abuela")]]),
      siblings: [],
      children: [],
    });

    expect(tree.father).toEqual({ kind: "member", member: padre });
    expect(tree.paternalGrandmother).toEqual({ kind: "member", member: abuela });
    expect(tree.paternalGrandfather).toEqual({ kind: "unknown" });
  });

  it("deja en desconocido a los abuelos cuando el padre no es visible", () => {
    // El vínculo del abuelo existe en los datos, pero a través de un hueco no
    // se puede afirmar nada.
    const tree = buildFamilyTree({
      self,
      links: links("padre-invisible", null),
      membersById: new Map([["abuelo", member("abuelo")]]),
      linksById: new Map([["padre-invisible", links("abuelo", null)]]),
      siblings: [],
      children: [],
    });

    expect(tree.father).toEqual({ kind: "unavailable" });
    expect(tree.paternalGrandfather).toEqual({ kind: "unknown" });
  });

  it("no duplica al hermano que comparte padre y madre", () => {
    const hermano = member("hermano");
    const tree = buildFamilyTree({
      self,
      links: links("padre", "madre"),
      membersById: new Map(),
      linksById: new Map(),
      siblings: [hermano, hermano],
      children: [],
    });

    expect(tree.siblings).toEqual([hermano]);
  });

  it("excluye a la propia mascota de los hermanos", () => {
    const tree = buildFamilyTree({
      self,
      links: links("padre", null),
      membersById: new Map(),
      linksById: new Map(),
      siblings: [self, member("hermana")],
      children: [],
    });

    expect(tree.siblings.map((s) => s.id)).toEqual(["hermana"]);
  });

  it("recoge como hijos a quienes la tienen de padre o de madre", () => {
    const cria = member("cria");
    const tree = buildFamilyTree({
      self,
      links: links(null, null),
      membersById: new Map(),
      linksById: new Map(),
      siblings: [],
      children: [cria, cria],
    });

    expect(tree.children).toEqual([cria]);
  });
});
