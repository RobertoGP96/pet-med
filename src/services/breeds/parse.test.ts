import { describe, expect, it } from "vitest";

import type { CatApiBreed, DogApiBreed } from "./api-types";
import {
  buildImageUrl,
  combineWeightRanges,
  normalizeCatBreed,
  normalizeDogBreed,
  parseLifeSpanYears,
  parseNumericLifeSpan,
  parseNumericWeightRange,
  parseRange,
  parseWeightRangeKg,
} from "./parse";

/** Perro tal y como lo devuelve dogapi.dog: JSON:API y con números ya limpios. */
const ANATOLIAN: DogApiBreed = {
  id: "c94e50a5-f733-4b15-8b11-54598c949b6f",
  type: "breed",
  attributes: {
    name: "Anatolian Shepherd Dog",
    description: "Perro guardián de rebaños originario de Turquía.",
    life: { min: 12, max: 14 },
    male_weight: { min: 60, max: 70 },
    female_weight: { min: 50, max: 60 },
    hypoallergenic: false,
  },
  relationships: {
    group: { data: { id: "56081cf0-fdf2-4114-9bf7-23a3f5b6af91", type: "group" } },
  },
};

/** dogapi.dog nombra los grupos como el AKC: «Working Group», no «Working». */
const GROUP_NAMES = new Map([["56081cf0-fdf2-4114-9bf7-23a3f5b6af91", "Working Group"]]);

/** Gato tal y como lo devuelve The Cat API: texto libre y rasgos del 1 al 5. */
const ABYSSINIAN: CatApiBreed = {
  id: "abys",
  name: "Abyssinian",
  weight: { imperial: "7  -  10", metric: "3 - 5" },
  life_span: "14 - 15",
  temperament: "Active, Energetic, Independent, Intelligent, Gentle",
  origin: "Egypt",
  description: "Gato activo y sociable, fácil de cuidar.",
  image: { url: "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg" },
  reference_image_id: "0XYvRd7oD",
  hypoallergenic: 0,
  energy_level: 5,
  grooming: 1,
  health_issues: 2,
  shedding_level: 3,
  child_friendly: 3,
  dog_friendly: 4,
  intelligence: 5,
};

// ===========================================================================
// Texto libre (The Cat API)
// ===========================================================================

describe("parseRange", () => {
  it("lee un rango con y sin espacios alrededor del guion", () => {
    expect(parseRange("23 - 25")).toEqual({ min: 23, max: 25 });
    expect(parseRange("23-25")).toEqual({ min: 23, max: 25 });
    expect(parseRange("7  -  10")).toEqual({ min: 7, max: 10 });
  });

  it("acepta el guion largo", () => {
    expect(parseRange("23 – 25")).toEqual({ min: 23, max: 25 });
  });

  it("ignora el sufijo «years» que añaden algunas fuentes", () => {
    expect(parseRange("10 - 12 years")).toEqual({ min: 10, max: 12 });
  });

  it("con un solo valor devuelve un rango degenerado", () => {
    expect(parseRange("5")).toEqual({ min: 5, max: 5 });
  });

  it("admite decimales con punto y con coma", () => {
    expect(parseRange("2.5 - 4,5")).toEqual({ min: 2.5, max: 4.5 });
  });

  it("ordena el rango si viene al revés", () => {
    expect(parseRange("25 - 23")).toEqual({ min: 23, max: 25 });
  });

  it("devuelve null cuando no hay números que leer", () => {
    expect(parseRange("NaN")).toBeNull();
    expect(parseRange("")).toBeNull();
    expect(parseRange("   ")).toBeNull();
    expect(parseRange(undefined)).toBeNull();
    expect(parseRange(null)).toBeNull();
  });
});

describe("parseWeightRangeKg", () => {
  it("normaliza el peso métrico", () => {
    expect(parseWeightRangeKg("3 - 5")).toEqual({ minKg: 3, maxKg: 5 });
  });

  it("rechaza pesos imposibles", () => {
    expect(parseWeightRangeKg("0")).toBeNull();
    expect(parseWeightRangeKg("10 - 500")).toBeNull();
  });

  it("rechaza el literal NaN que publican algunas razas", () => {
    expect(parseWeightRangeKg("NaN")).toBeNull();
  });
});

describe("parseLifeSpanYears", () => {
  it("lee la vida con y sin sufijo", () => {
    expect(parseLifeSpanYears("14 - 15")).toEqual({ minYears: 14, maxYears: 15 });
    expect(parseLifeSpanYears("10 - 12 years")).toEqual({ minYears: 10, maxYears: 12 });
  });

  it("rechaza esperanzas de vida imposibles", () => {
    expect(parseLifeSpanYears("0")).toBeNull();
    expect(parseLifeSpanYears("10 - 90 years")).toBeNull();
  });
});

// ===========================================================================
// Rangos numéricos (dogapi.dog)
// ===========================================================================

describe("parseNumericWeightRange", () => {
  it("lee un rango completo", () => {
    expect(parseNumericWeightRange({ min: 50, max: 70 })).toEqual({ minKg: 50, maxKg: 70 });
  });

  it("degenera el rango cuando falta uno de los extremos", () => {
    expect(parseNumericWeightRange({ min: 30, max: null })).toEqual({ minKg: 30, maxKg: 30 });
    expect(parseNumericWeightRange({ min: null, max: 30 })).toEqual({ minKg: 30, maxKg: 30 });
  });

  it("ordena el rango si viene invertido", () => {
    expect(parseNumericWeightRange({ min: 70, max: 50 })).toEqual({ minKg: 50, maxKg: 70 });
  });

  it("devuelve null sin datos o con valores imposibles", () => {
    expect(parseNumericWeightRange(null)).toBeNull();
    expect(parseNumericWeightRange(undefined)).toBeNull();
    expect(parseNumericWeightRange({ min: null, max: null })).toBeNull();
    expect(parseNumericWeightRange({ min: 0, max: 0 })).toBeNull();
    expect(parseNumericWeightRange({ min: 10, max: 900 })).toBeNull();
  });
});

describe("parseNumericLifeSpan", () => {
  it("lee la esperanza de vida", () => {
    expect(parseNumericLifeSpan({ min: 12, max: 14 })).toEqual({ minYears: 12, maxYears: 14 });
  });

  it("rechaza valores fuera de lo creíble", () => {
    expect(parseNumericLifeSpan({ min: 0, max: 0 })).toBeNull();
    expect(parseNumericLifeSpan({ min: 5, max: 90 })).toBeNull();
    expect(parseNumericLifeSpan(null)).toBeNull();
  });
});

describe("combineWeightRanges", () => {
  it("abarca los dos sexos", () => {
    expect(
      combineWeightRanges({ minKg: 60, maxKg: 70 }, { minKg: 50, maxKg: 60 }),
    ).toEqual({ minKg: 50, maxKg: 70 });
  });

  it("usa el que haya cuando falta uno", () => {
    expect(combineWeightRanges({ minKg: 60, maxKg: 70 }, null)).toEqual({ minKg: 60, maxKg: 70 });
    expect(combineWeightRanges(null, { minKg: 50, maxKg: 60 })).toEqual({ minKg: 50, maxKg: 60 });
    expect(combineWeightRanges(null, null)).toBeNull();
  });
});

// ===========================================================================
// Imágenes
// ===========================================================================

describe("buildImageUrl", () => {
  it("prefiere la url que ya trae la respuesta", () => {
    expect(buildImageUrl("cat", "0XYvRd7oD", "https://ejemplo.test/foto.jpg")).toBe(
      "https://ejemplo.test/foto.jpg",
    );
  });

  it("arma la url del CDN de gatos con el id de referencia", () => {
    expect(buildImageUrl("cat", "0XYvRd7oD", null)).toBe(
      "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
    );
  });

  it("ignora las cadenas vacías y cae al id de referencia", () => {
    expect(buildImageUrl("cat", "0XYvRd7oD", "   ")).toBe(
      "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
    );
  });

  it("devuelve null si no hay ni url ni id de referencia", () => {
    expect(buildImageUrl("cat", undefined, undefined)).toBeNull();
    expect(buildImageUrl("cat", "", "")).toBeNull();
  });

  it("devuelve null para especies sin CDN propio", () => {
    // Los perros ya no tienen CDN de raza: sus fotos vienen de dog.ceo.
    expect(buildImageUrl("dog", "abc123", undefined)).toBeNull();
    expect(buildImageUrl("rabbit", "abc123", undefined)).toBeNull();
  });
});

// ===========================================================================
// Normalización
// ===========================================================================

describe("normalizeDogBreed", () => {
  it("normaliza una raza real de dogapi.dog", () => {
    expect(normalizeDogBreed(ANATOLIAN, GROUP_NAMES)).toMatchObject({
      id: "c94e50a5-f733-4b15-8b11-54598c949b6f",
      sourceName: "Anatolian Shepherd Dog",
      species: "dog",
      // El rango general abarca a los dos sexos.
      weightRange: { minKg: 50, maxKg: 70 },
      weightBySex: {
        male: { minKg: 60, maxKg: 70 },
        female: { minKg: 50, maxKg: 60 },
      },
      lifeSpan: { minYears: 12, maxYears: 14 },
      temperament: null,
      bredFor: null,
      breedGroup: "Grupo de trabajo",
      hypoallergenic: false,
      traits: null,
      imageUrl: null,
    });
  });

  it("traduce el nombre y la reseña de una raza del catálogo", () => {
    const perfil = normalizeDogBreed(ANATOLIAN, GROUP_NAMES);

    expect(perfil.name).toBe("Pastor de Anatolia");
    expect(perfil.descriptionLang).toBe("es");
    // La reseña sale del catálogo traducido, no del `description` que mandó la
    // API: es más completa y ya está en español.
    expect(perfil.description).not.toBe(ANATOLIAN.attributes?.description);
    expect(perfil.description).toMatch(/Turquía/);
  });

  it("se queda con el texto de la API si la raza aún no está traducida", () => {
    const inventada: DogApiBreed = {
      ...ANATOLIAN,
      attributes: { ...ANATOLIAN.attributes, name: "Pomeranian Wolfhound" },
    };

    const perfil = normalizeDogBreed(inventada, GROUP_NAMES);

    expect(perfil.name).toBe("Pomeranian Wolfhound");
    expect(perfil.sourceName).toBe("Pomeranian Wolfhound");
    expect(perfil.description).toBe(ANATOLIAN.attributes?.description);
    // Marcado como inglés aunque este fixture esté en español: lo que se
    // comprueba es que una reseña sin traducir se señale para el `lang`.
    expect(perfil.descriptionLang).toBe("en");
  });

  it("deja el grupo en null si no se pudo resolver su nombre", () => {
    expect(normalizeDogBreed(ANATOLIAN).breedGroup).toBeNull();
    expect(normalizeDogBreed(ANATOLIAN, new Map()).breedGroup).toBeNull();
  });

  it("no ofrece desglose por sexo si sólo viene un sexo", () => {
    const soloMacho: DogApiBreed = {
      ...ANATOLIAN,
      attributes: { ...ANATOLIAN.attributes, female_weight: null },
    };

    const perfil = normalizeDogBreed(soloMacho, GROUP_NAMES);
    // Comparar una hembra contra el rango del macho daría un falso positivo.
    expect(perfil.weightBySex).toBeNull();
    expect(perfil.weightRange).toEqual({ minKg: 60, maxKg: 70 });
  });

  it("sobrevive a una raza sin ningún atributo", () => {
    expect(normalizeDogBreed({ id: "x", attributes: {} })).toEqual({
      id: "x",
      name: "",
      sourceName: "",
      species: "dog",
      weightRange: null,
      weightBySex: null,
      lifeSpan: null,
      temperament: null,
      bredFor: null,
      breedGroup: null,
      description: null,
      // Sin reseña no hay nada que marcar como inglés.
      descriptionLang: "es",
      hypoallergenic: null,
      traits: null,
      imageUrl: null,
    });
  });

  it("sobrevive a un recurso completamente vacío", () => {
    expect(normalizeDogBreed({})).toMatchObject({ id: "", name: "", species: "dog" });
  });
});

describe("normalizeCatBreed", () => {
  it("normaliza una raza real de The Cat API", () => {
    const perfil = normalizeCatBreed(ABYSSINIAN);

    expect(perfil).toMatchObject({
      id: "abys",
      name: "Abisinio",
      sourceName: "Abyssinian",
      species: "cat",
      weightRange: { minKg: 3, maxKg: 5 },
      // The Cat API publica un rango único, sin distinguir sexo.
      weightBySex: null,
      lifeSpan: { minYears: 14, maxYears: 15 },
      // Los adjetivos salen del diccionario de temperamentos.
      temperament: "Activo, Enérgico, Independiente, Inteligente, Apacible",
      // Los gatos no se criaron para una tarea: el campo queda vacío.
      bredFor: null,
      // En gatos, `breedGroup` es el país de origen.
      breedGroup: "Egipto",
      descriptionLang: "es",
      hypoallergenic: false,
      imageUrl: "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
    });

    expect(perfil.traits).toMatchObject({
      energyLevel: 5,
      grooming: 1,
      healthIssues: 2,
      sheddingLevel: 3,
      childFriendly: 3,
      dogFriendly: 4,
      intelligence: 5,
      // Los que no vienen se quedan a null, no a cero.
      socialNeeds: null,
      vocalisation: null,
    });
  });

  it("traduce hypoallergenic de 0/1 a booleano", () => {
    expect(normalizeCatBreed({ ...ABYSSINIAN, hypoallergenic: 1 }).hypoallergenic).toBe(true);
    expect(normalizeCatBreed({ ...ABYSSINIAN, hypoallergenic: undefined }).hypoallergenic).toBeNull();
  });

  it("descarta rasgos fuera de la escala 1-5", () => {
    const raro = normalizeCatBreed({ ...ABYSSINIAN, energy_level: 0, grooming: 9 });
    expect(raro.traits?.energyLevel).toBeNull();
    expect(raro.traits?.grooming).toBeNull();
  });

  it("cae al CDN cuando la respuesta no trae imagen", () => {
    expect(normalizeCatBreed({ ...ABYSSINIAN, image: undefined }).imageUrl).toBe(
      "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
    );
  });

  it("deja los textos opcionales en null cuando no vienen", () => {
    const minimo: CatApiBreed = {
      id: "test",
      name: "Raza de prueba",
      weight: { imperial: "", metric: "" },
      life_span: "",
    };

    expect(normalizeCatBreed(minimo)).toMatchObject({
      id: "test",
      name: "Raza de prueba",
      species: "cat",
      weightRange: null,
      lifeSpan: null,
      temperament: null,
      bredFor: null,
      breedGroup: null,
      description: null,
      hypoallergenic: null,
      imageUrl: null,
    });
  });
});
