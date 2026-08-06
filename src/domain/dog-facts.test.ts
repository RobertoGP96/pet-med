import { describe, expect, it } from "vitest";

import { DOG_FACTS, pickDogFact } from "./dog-facts";

describe("DOG_FACTS", () => {
  it("no tiene curiosidades repetidas ni vacías", () => {
    expect(DOG_FACTS.length).toBeGreaterThan(0);
    expect(new Set(DOG_FACTS).size).toBe(DOG_FACTS.length);
    expect(DOG_FACTS.every((fact) => fact.trim().length > 0)).toBe(true);
  });
});

describe("pickDogFact", () => {
  it("devuelve la misma curiosidad durante todo el día", () => {
    const manana = pickDogFact(new Date("2026-08-03T07:00:00Z"));
    const noche = pickDogFact(new Date("2026-08-03T23:59:59Z"));

    expect(manana).toBe(noche);
  });

  it("cambia de un día al siguiente", () => {
    const hoy = pickDogFact(new Date("2026-08-03T12:00:00Z"));
    const manana = pickDogFact(new Date("2026-08-04T12:00:00Z"));

    expect(hoy).not.toBe(manana);
  });

  it("recorre la lista entera antes de repetir", () => {
    const vistas = new Set<string>();
    for (let dia = 0; dia < DOG_FACTS.length; dia += 1) {
      vistas.add(pickDogFact(new Date(Date.UTC(2026, 0, 1 + dia))));
    }

    expect(vistas.size).toBe(DOG_FACTS.length);
  });

  it("no se sale del array con una fecha anterior a 1970", () => {
    // El resto de un número negativo es negativo en JavaScript.
    expect(DOG_FACTS).toContain(pickDogFact(new Date("1969-07-20T00:00:00Z")));
  });
});
