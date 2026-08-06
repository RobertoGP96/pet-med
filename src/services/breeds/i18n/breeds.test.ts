import { describe, expect, it } from "vitest";

import { findBreedText, toSourceBreedName } from "./breeds";

describe("findBreedText", () => {
  it("encuentra una raza de perro por su nombre inglés", () => {
    expect(findBreedText("dog", "German Shepherd Dog")?.name).toBe("Pastor Alemán");
  });

  it("encuentra una raza de gato por su nombre inglés", () => {
    expect(findBreedText("cat", "Abyssinian")?.name).toBe("Abisinio");
  });

  it("no distingue mayúsculas, acentos ni espacios de sobra", () => {
    expect(findBreedText("dog", "  border   COLLIE ")?.name).toBe("Border Collie");
  });

  it("devuelve null para una raza que no está en el catálogo", () => {
    expect(findBreedText("dog", "Pomeranian Wolfhound")).toBeNull();
    expect(findBreedText("dog", "")).toBeNull();
  });

  it("devuelve null para una especie sin catálogo traducido", () => {
    expect(findBreedText("rabbit", "Angora")).toBeNull();
  });

  it("no cruza especies: un gato no aparece entre los perros", () => {
    expect(findBreedText("dog", "Abyssinian")).toBeNull();
  });
});

describe("toSourceBreedName", () => {
  it("devuelve el nombre inglés a partir del español", () => {
    expect(toSourceBreedName("dog", "Pastor Alemán")).toBe("german shepherd dog");
    expect(toSourceBreedName("dog", "Teckel")).toBe("dachshund");
  });

  it("no distingue mayúsculas ni acentos", () => {
    expect(toSourceBreedName("dog", "pastor aleman")).toBe("german shepherd dog");
  });

  it("deja pasar un nombre que ya venía en inglés", () => {
    expect(toSourceBreedName("dog", "Golden Retriever")).toBe("Golden Retriever");
  });

  it("deja pasar una raza escrita a mano que no está en el catálogo", () => {
    expect(toSourceBreedName("dog", "Mestizo de barrio")).toBe("Mestizo de barrio");
  });
});
