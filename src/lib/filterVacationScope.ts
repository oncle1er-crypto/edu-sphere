export interface VacationScopeData<
  C extends { id: string; cycle_id: string | null },
  E extends { id: string; classe_id: string },
  P extends { classe_id: string; eleve_id: string },
  T extends { id: string; classe_id: string | null },
  H extends { enseignant_id: string },
> {
  classes: C[];
  eleves: E[];
  paiements: P[];
  enseignants: T[];
  honoraires: H[];
}

/**
 * Applique un même périmètre de niveau à tout le graphe Cours de vacances.
 * Une classe sans cycle et un enseignant sans classe sont des données communes.
 */
export function filterVacationScope<C extends { id: string; cycle_id: string | null }, E extends { id: string; classe_id: string }, P extends { classe_id: string; eleve_id: string }, T extends { id: string; classe_id: string | null }, H extends { enseignant_id: string }>(
  data: VacationScopeData<C, E, P, T, H>,
  isGlobal: boolean,
  matchesCycle: (cycleId: string | null | undefined) => boolean,
): VacationScopeData<C, E, P, T, H> {
  if (isGlobal) return data;

  const classes = data.classes.filter((row) => matchesCycle(row.cycle_id));
  const classeIds = new Set(classes.map((row) => row.id));
  const eleves = data.eleves.filter((row) => classeIds.has(row.classe_id));
  const eleveIds = new Set(eleves.map((row) => row.id));
  const enseignants = data.enseignants.filter((row) => !row.classe_id || classeIds.has(row.classe_id));
  const enseignantIds = new Set(enseignants.map((row) => row.id));

  return {
    classes,
    eleves,
    paiements: data.paiements.filter((row) => classeIds.has(row.classe_id) && eleveIds.has(row.eleve_id)),
    enseignants,
    honoraires: data.honoraires.filter((row) => enseignantIds.has(row.enseignant_id)),
  };
}
