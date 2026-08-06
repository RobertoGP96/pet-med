import { describe, expect, it } from "vitest";

import {
  foldKey,
  translateBreedGroup,
  translateOrigin,
  translateTemperament,
} from "./vocabulary";

describe("foldKey", () => {
  it("quita acentos, mayúsculas y espacios de sobra", () => {
    expect(foldKey("  Pastor   ALEMÁN ")).toBe("pastor aleman");
  });
});

describe("translateBreedGroup", () => {
  it("traduce los grupos del AKC", () => {
    expect(translateBreedGroup("Working Group")).toBe("Grupo de trabajo");
    expect(translateBreedGroup("Herding Group")).toBe("Grupo de pastoreo");
    expect(translateBreedGroup("Non-Sporting Group")).toBe("Grupo de compañía");
  });

  it("no distingue mayúsculas ni espacios sobrantes", () => {
    expect(translateBreedGroup("  toy group  ")).toBe("Grupo toy");
  });

  it("devuelve el original si la API estrena un grupo", () => {
    expect(translateBreedGroup("Companion Group")).toBe("Companion Group");
  });

  it("devuelve null si no hay grupo", () => {
    expect(translateBreedGroup(null)).toBeNull();
    expect(translateBreedGroup("   ")).toBeNull();
  });
});

describe("translateOrigin", () => {
  it("traduce los países de The Cat API", () => {
    expect(translateOrigin("Egypt")).toBe("Egipto");
    expect(translateOrigin("United Kingdom")).toBe("Reino Unido");
    expect(translateOrigin("Iran (Persia)")).toBe("Irán (Persia)");
  });

  it("deja igual los que se escriben igual en los dos idiomas", () => {
    expect(translateOrigin("Australia")).toBe("Australia");
  });
});

describe("translateTemperament", () => {
  it("traduce la lista entera manteniendo el orden", () => {
    expect(translateTemperament("Active, Energetic, Independent")).toBe(
      "Activo, Enérgico, Independiente",
    );
  });

  it("tolera la grafía inconsistente de la fuente", () => {
    // The Cat API manda «Social» y «social», «Easy Going» y «Easygoing».
    expect(translateTemperament("social")).toBe("Sociable");
    expect(translateTemperament("Easy Going")).toBe(translateTemperament("Easygoing"));
  });

  it("no repite una palabra cuando dos términos ingleses coinciden en español", () => {
    // «Sociable, Social» son la misma palabra en español.
    expect(translateTemperament("Sociable, Social, Playful")).toBe("Sociable, Juguetón");
  });

  it("mantiene sin traducir el adjetivo que no esté en el diccionario", () => {
    expect(translateTemperament("Active, Broody")).toBe("Activo, Broody");
  });

  it("descarta los huecos que deja una lista mal formada", () => {
    expect(translateTemperament("Active,, Calm,")).toBe("Activo, Tranquilo");
  });

  it("devuelve null si no hay temperamento", () => {
    expect(translateTemperament(null)).toBeNull();
    expect(translateTemperament(" , , ")).toBeNull();
  });
});
