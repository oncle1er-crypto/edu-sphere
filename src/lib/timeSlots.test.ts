import { describe, it, expect } from "vitest";
import { buildVariableSlots, timeToMinutes, minutesToTime } from "./timeSlots";

describe("timeToMinutes / minutesToTime", () => {
  it("convertit HH:MM en minutes depuis minuit", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:45")).toBe(585);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("accepte aussi HH:MM:SS", () => {
    expect(timeToMinutes("11:50:00")).toBe(710);
  });

  it("minutesToTime produit HH:MM:SS, aller-retour cohérent avec timeToMinutes", () => {
    expect(minutesToTime(585)).toBe("09:45:00");
    expect(minutesToTime(0)).toBe("00:00:00");
    expect(timeToMinutes(minutesToTime(710))).toBe(710);
  });
});

describe("buildVariableSlots", () => {
  it("sans pause : découpe la journée en créneaux pleins, sans reliquat partiel", () => {
    // 08:00 -> 11:00, créneaux de 60 min : 3 créneaux exacts, rien après.
    const slots = buildVariableSlots(480, 660, 60, []);
    expect(slots).toEqual([
      { start: 480, end: 540 },
      { start: 540, end: 600 },
      { start: 600, end: 660 },
    ]);
  });

  it("ne produit pas de créneau partiel en fin de journée (comportement historique)", () => {
    // 08:00 -> 09:50, créneaux de 60 min : un seul créneau plein, les 50 min
    // restantes ne donnent PAS de créneau.
    const slots = buildVariableSlots(480, 590, 60, []);
    expect(slots).toEqual([{ start: 480, end: 540 }]);
  });

  it("raccourcit le créneau qui chevauche une pause interne, reprend pile à la fin de la pause", () => {
    // 08:00 -> 10:30, récréation 09:45-10:00, créneaux de 60 min.
    // Attendu : 08:00-09:00 (plein), 09:00-09:45 (raccourci par la pause),
    // 10:00-10:30 (reprend à la fin de la pause, mais 30 min < 60 -> pas de créneau).
    const slots = buildVariableSlots(480, 630, 60, [{ start: 585, end: 600 }]);
    expect(slots).toEqual([
      { start: 480, end: 540 },
      { start: 540, end: 585 },
    ]);
  });

  it("régression : une pause qui tombe exactement en fin de plage doit raccourcir, pas supprimer le créneau", () => {
    // Bug corrigé le 13/08/2026 : quand generateEmploiDuTemps découpait matin
    // et après-midi en deux appels séparés, la pause déjeuner devenait la
    // "fin de journée" du côté matin et le créneau qui la précédait
    // disparaissait purement, au lieu d'être raccourci comme dans la vue
    // hebdomadaire. Ce test fixe le comportement attendu quand la pause est
    // fournie comme une VRAIE pause interne (dayEnd dépasse la pause) :
    // 10:00 -> 11:50 (pause déjeuner), créneaux de 60 min, journée qui
    // continue après 13:30 -> le créneau 11:00-11:50 doit exister.
    const slots = buildVariableSlots(600, 1020, 60, [{ start: 710, end: 810 }]);
    expect(slots).toContainEqual({ start: 660, end: 710 }); // 11:00-11:50, raccourci
    expect(slots.some((s) => s.start === 710 && s.end < 810)).toBe(false); // rien démarré pendant la pause
  });

  it("gère deux pauses dans la même plage (récréation + déjeuner)", () => {
    // 08:00 -> 17:00, récréation 09:45-10:00, déjeuner 11:50-13:30, créneaux 60 min.
    const slots = buildVariableSlots(480, 1020, 60, [
      { start: 585, end: 600 }, // récréation
      { start: 710, end: 810 }, // déjeuner
    ]);
    expect(slots).toEqual([
      { start: 480, end: 540 }, // 08:00-09:00
      { start: 540, end: 585 }, // 09:00-09:45 (raccourci, récréation)
      { start: 600, end: 660 }, // 10:00-11:00
      { start: 660, end: 710 }, // 11:00-11:50 (raccourci, déjeuner)
      { start: 810, end: 870 }, // 13:30-14:30
      { start: 870, end: 930 }, // 14:30-15:30
      { start: 930, end: 990 }, // 15:30-16:30
      // 990-1020 (30 min) : pas de créneau, reliquat < durée.
    ]);
  });

  it("ignore les pauses invalides (end <= start)", () => {
    // 480->600 = 120 min = exactement 2 créneaux de 60 min ; la pause
    // invalide (end === start) doit être ignorée, pas provoquer de découpage.
    const slots = buildVariableSlots(480, 600, 60, [{ start: 500, end: 500 }]);
    expect(slots).toEqual([
      { start: 480, end: 540 },
      { start: 540, end: 600 },
    ]);
  });

  it("aucun créneau si la journée est plus courte que la durée d'un créneau", () => {
    expect(buildVariableSlots(480, 520, 60, [])).toEqual([]);
  });

  it("trie les pauses même si elles sont fournies dans le désordre", () => {
    const slots = buildVariableSlots(480, 660, 60, [
      { start: 600, end: 610 },
      { start: 500, end: 510 },
    ]);
    // Doit quand même produire un découpage cohérent sans boucle infinie.
    expect(slots.every((s) => s.end > s.start)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
  });
});
