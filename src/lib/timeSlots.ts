/**
 * Découpe d'une journée en créneaux, en tenant compte de pauses positionnées
 * dans le temps (récréation, déjeuner) qui ne tombent pas forcément sur une
 * frontière de créneau. Logique partagée entre la vue hebdomadaire manuelle
 * (useTimetableSettings.slotsFromSettings) et le générateur automatique
 * (generateEmploiDuTemps.buildSlotsTemplate), pour que les deux produisent
 * exactement le même découpage.
 */

export interface MinuteRange {
  start: number;
  end: number;
}

/** Convertit "HH:MM" ou "HH:MM:SS" en minutes depuis minuit. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Convertit des minutes depuis minuit en "HH:MM:SS". */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Découpe [dayStart, dayEnd) en créneaux de durée `duration` (minutes).
 *
 * Quand une pause (récréation, déjeuner…) démarre au milieu d'un créneau qui
 * serait sinon placé, ce créneau est RACCOURCI pour s'arrêter pile à l'heure
 * de début de la pause ; le découpage reprend pile à la fin de la pause.
 * Aucun créneau n'est produit en fin de journée si sa durée pleine dépasse
 * `dayEnd` (comportement historique conservé : pas de créneau partiel en fin
 * de journée, seulement autour des pauses).
 */
export function buildVariableSlots(
  dayStart: number,
  dayEnd: number,
  duration: number,
  breaks: MinuteRange[]
): MinuteRange[] {
  const sorted = [...breaks]
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const slots: MinuteRange[] = [];
  let cur = dayStart;
  while (cur < dayEnd) {
    const active = sorted.find((b) => cur >= b.start && cur < b.end);
    if (active) {
      cur = active.end;
      continue;
    }
    const naturalEnd = cur + duration;
    if (naturalEnd > dayEnd) break;
    const nextBreak = sorted.find((b) => b.start > cur && b.start < naturalEnd);
    const end = nextBreak ? nextBreak.start : naturalEnd;
    if (end <= cur) break; // garde-fou anti-boucle infinie
    slots.push({ start: cur, end });
    cur = end;
  }
  return slots;
}
