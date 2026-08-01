import { describe, expect, it } from "vitest";

import type { ClinicalEvent, Medication, MedicationDose, WeightEntry } from "../types";
import { getAge, getHumanAgeEquivalent, getLifeStage, getNextBirthday } from "./age";
import { generateDoseSchedule, getAdherence, getOverdueDoses } from "./medication";
import { getPreventionStatus } from "./prevention";
import { assessBodyCondition, compareWithBreedRange, estimateIdealWeight, getWeightTrend } from "./weight";

const NOW = new Date("2026-08-01T12:00:00.000Z");

function weight(measuredAt: string, weightKg: number, bcs: number | null = null): WeightEntry {
  return {
    id: `w-${measuredAt}`,
    petId: "pet-1",
    measuredAt,
    weightKg,
    bodyConditionScore: bcs,
    notes: null,
    createdAt: `${measuredAt}T00:00:00.000Z`,
  };
}

describe("edad", () => {
  it("calcula años y meses completos", () => {
    const age = getAge("2023-05-01", NOW);
    expect(age.years).toBe(3);
    expect(age.months).toBe(3);
    expect(age.totalMonths).toBe(39);
  });

  it("no devuelve edades negativas para fechas futuras", () => {
    expect(getAge("2027-01-01", NOW).totalMonths).toBe(0);
  });

  it("adelanta la etapa senior en razas grandes", () => {
    // A los 8 años (96 meses) un perro gigante ya es senior, mientras que uno
    // pequeño apenas entra en la madurez: no será senior hasta los 11.
    expect(getLifeStage("dog", 96, "giant")).toBe("senior");
    expect(getLifeStage("dog", 96, "small")).toBe("mature");
    expect(getLifeStage("dog", 132, "small")).toBe("senior");
  });

  it("usa umbrales propios para los gatos", () => {
    expect(getLifeStage("cat", 3, null)).toBe("baby");
    expect(getLifeStage("cat", 96, null)).toBe("mature");
    expect(getLifeStage("cat", 140, null)).toBe("senior");
  });

  it("aplica la fórmula epigenética en perros", () => {
    // 16·ln(1) + 31 = 31
    expect(getHumanAgeEquivalent("dog", 1)).toBe(31);
    // 16·ln(5) + 31 ≈ 56,7
    expect(getHumanAgeEquivalent("dog", 5)).toBe(57);
  });

  it("usa la escala clínica en gatos", () => {
    expect(getHumanAgeEquivalent("cat", 1)).toBe(15);
    expect(getHumanAgeEquivalent("cat", 2)).toBe(24);
    expect(getHumanAgeEquivalent("cat", 5)).toBe(36);
  });

  it("no inventa equivalencia en especies sin referencia", () => {
    expect(getHumanAgeEquivalent("reptile", 5)).toBeNull();
  });

  it("encuentra el próximo cumpleaños saltando de año cuando ya pasó", () => {
    const birthday = getNextBirthday("2020-03-15", NOW);
    expect(birthday.date.getFullYear()).toBe(2027);
    expect(birthday.turningAge).toBe(7);
  });

  it("detecta el cumpleaños de hoy", () => {
    const birthday = getNextBirthday("2020-08-01", new Date("2026-08-01T12:00:00"));
    expect(birthday.isToday).toBe(true);
    expect(birthday.daysUntil).toBe(0);
  });
});

describe("peso", () => {
  it("marca alerta cuando la pérdida supera el 10 %", () => {
    const trend = getWeightTrend([weight("2026-01-01", 20), weight("2026-07-01", 17)], NOW);
    expect(trend?.direction).toBe("down");
    expect(trend?.changePercent).toBe(-15);
    expect(trend?.level).toBe("alert");
  });

  it("considera estable una variación menor al 1 %", () => {
    const trend = getWeightTrend([weight("2026-01-01", 20), weight("2026-07-01", 20.1)], NOW);
    expect(trend?.direction).toBe("stable");
    expect(trend?.level).toBe("good");
  });

  it("informa de que falta histórico con una sola medición", () => {
    const trend = getWeightTrend([weight("2026-07-01", 20)], NOW);
    expect(trend?.level).toBe("unknown");
    expect(trend?.previous).toBeNull();
  });

  it("interpreta la escala BCS de 9 puntos", () => {
    expect(assessBodyCondition(5).level).toBe("good");
    expect(assessBodyCondition(7).level).toBe("watch");
    expect(assessBodyCondition(9).level).toBe("alert");
    expect(assessBodyCondition(1).level).toBe("alert");
  });

  it("estima el peso ideal descontando el exceso por punto de BCS", () => {
    // BCS 7 => 20 % por encima del ideal => 24 / 1,2 = 20
    expect(estimateIdealWeight(24, 7)).toBe(20);
    expect(estimateIdealWeight(20, 5)).toBe(20);
  });

  it("sitúa el peso dentro del rango de la raza con margen del 15 %", () => {
    const range = { minKg: 20, maxKg: 30 };
    expect(compareWithBreedRange(25, range)?.level).toBe("good");
    expect(compareWithBreedRange(32, range)?.level).toBe("watch");
    expect(compareWithBreedRange(40, range)?.level).toBe("alert");
    expect(compareWithBreedRange(15, range)?.level).toBe("alert");
  });

  it("no compara sin rango de raza conocido", () => {
    expect(compareWithBreedRange(25, null)).toBeNull();
  });
});

describe("medicación", () => {
  const medication: Pick<Medication, "startDate" | "endDate" | "intervalHours"> = {
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    intervalHours: 12,
  };

  it("genera tomas cada intervalo y respeta la fecha de fin", () => {
    const schedule = generateDoseSchedule(
      medication,
      new Date("2026-08-01T00:00:00"),
      new Date("2026-08-10T00:00:00"),
    );
    // 1, 2 y 3 de agosto a las 08:00 y 20:00 => 6 tomas.
    expect(schedule).toHaveLength(6);
  });

  it("es determinista: dos generaciones dan las mismas marcas de tiempo", () => {
    const from = new Date("2026-08-01T00:00:00");
    const to = new Date("2026-08-10T00:00:00");
    expect(generateDoseSchedule(medication, from, to)).toEqual(
      generateDoseSchedule(medication, from, to),
    );
  });

  it("no genera tomas con intervalo inválido", () => {
    expect(
      generateDoseSchedule(
        { ...medication, intervalHours: 0 },
        new Date("2026-08-01"),
        new Date("2026-08-10"),
      ),
    ).toEqual([]);
  });

  it("cuenta como no administrada una toma pendiente cuya hora ya pasó", () => {
    const doses: MedicationDose[] = [
      dose("d1", "2026-07-31T08:00:00.000Z", "taken"),
      dose("d2", "2026-07-31T20:00:00.000Z", "pending"),
      dose("d3", "2026-08-05T08:00:00.000Z", "pending"), // futura: no penaliza
    ];

    const adherence = getAdherence(doses, NOW);
    expect(adherence.due).toBe(2);
    expect(adherence.taken).toBe(1);
    expect(adherence.percent).toBe(50);
    expect(adherence.level).toBe("alert");
  });

  it("lista sólo las tomas vencidas", () => {
    const doses: MedicationDose[] = [
      dose("d1", "2026-07-31T20:00:00.000Z", "pending"),
      dose("d2", "2026-08-05T08:00:00.000Z", "pending"),
    ];
    expect(getOverdueDoses(doses, NOW).map((d) => d.id)).toEqual(["d1"]);
  });
});

function dose(id: string, scheduledAt: string, status: MedicationDose["status"]): MedicationDose {
  return {
    id,
    medicationId: "med-1",
    petId: "pet-1",
    scheduledAt,
    takenAt: status === "taken" ? scheduledAt : null,
    status,
    notes: null,
    createdAt: scheduledAt,
  };
}

describe("prevención", () => {
  function event(occurredAt: string, nextDueAt: string | null): ClinicalEvent {
    return {
      id: `e-${occurredAt}`,
      petId: "pet-1",
      type: "vaccine",
      title: "Polivalente",
      occurredAt,
      vetName: null,
      clinic: null,
      description: null,
      nextDueAt,
      createdAt: `${occurredAt}T00:00:00.000Z`,
      updatedAt: `${occurredAt}T00:00:00.000Z`,
    };
  }

  it("marca alerta si el refuerzo venció", () => {
    const status = getPreventionStatus([event("2025-06-01", "2026-06-01")], "vaccine", NOW, "vacunación");
    expect(status.level).toBe("alert");
    expect(status.daysUntilDue).toBeLessThan(0);
  });

  it("avisa cuando el refuerzo está cerca", () => {
    const status = getPreventionStatus([event("2025-08-20", "2026-08-20")], "vaccine", NOW, "vacunación");
    expect(status.level).toBe("watch");
  });

  it("distingue 'sin registro' de 'al día'", () => {
    expect(getPreventionStatus([], "vaccine", NOW, "vacunación").level).toBe("unknown");
    expect(
      getPreventionStatus([event("2026-07-01", "2027-07-01")], "vaccine", NOW, "vacunación").level,
    ).toBe("good");
  });

  it("marca 'vigilar' si hay vacuna pero nadie anotó el refuerzo", () => {
    expect(getPreventionStatus([event("2026-07-01", null)], "vaccine", NOW, "vacunación").level).toBe(
      "watch",
    );
  });
});
