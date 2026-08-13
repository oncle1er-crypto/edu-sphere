import { supabase } from "@/integrations/supabase/client";
import { buildVariableSlots } from "@/lib/timeSlots";

export interface GenerateOptions {
  ecoleId: string;
  anneeId: string;
  jours: number[];                // ex: [1,2,3,4,5]
  plageMatin: [string, string];   // ex: ["08:00","12:00"]
  plageAprem: [string, string];   // ex: ["14:00","17:00"]
  recreation?: [string, string];  // ex: ["09:45","10:00"] — raccourcit le créneau qui la chevauche
  dureeCreneauMin: number;        // ex: 60
  heuresParJourMax: number;       // ex: 6
  respectDispo: boolean;
  eviterTrous: boolean;
  matinLourd?: boolean;           // Regrouper matières lourdes le matin (défaut: true)
  effacerAvant: boolean;
  dryRun: boolean;
}


export interface GenerateReport {
  placed: number;
  failed: { classe: string; matiere: string; manquant: number; raison: string }[];
  conflits: number;
  duree_ms: number;
  totalAttendu: number;
}

type Creneau = {
  ecole_id: string;
  annee_id: string;
  classe_id: string;
  matiere_id: string;
  enseignant_id: string | null;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  salle_id: string | null;
  salle: string | null;
};

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(m: number) {
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}:00`;
}

function buildSlotsTemplate(opts: GenerateOptions) {
  const slots: { jour: number; debut: string; fin: string; plage: "matin" | "apres_midi" }[] = [];
  const recreation = opts.recreation
    ? { start: timeToMin(opts.recreation[0]), end: timeToMin(opts.recreation[1]) }
    : null;

  // Un seul découpage sur toute la journée (comme useTimetableSettings.slotsFromSettings),
  // avec la pause déjeuner traitée comme une pause interne et non comme une fin de
  // plage : sinon le créneau qui la précède (ex. 11h00-11h50) serait purement
  // supprimé au lieu d'être raccourci, contrairement à ce qui est affiché dans la
  // vue hebdomadaire (cf. commentaire en tête de src/lib/timeSlots.ts).
  const dayStart = timeToMin(opts.plageMatin[0]);
  const pauseDejDebut = timeToMin(opts.plageMatin[1]);
  const pauseDejFin = timeToMin(opts.plageAprem[0]);
  const dayEnd = timeToMin(opts.plageAprem[1]);
  const breaks = [{ start: pauseDejDebut, end: pauseDejFin }];
  if (recreation && recreation.start >= dayStart && recreation.end <= dayEnd) {
    breaks.push(recreation);
  }

  for (const j of opts.jours) {
    for (const sl of buildVariableSlots(dayStart, dayEnd, opts.dureeCreneauMin, breaks)) {
      const plage: "matin" | "apres_midi" = sl.start < pauseDejDebut ? "matin" : "apres_midi";
      slots.push({ jour: j, debut: minToTime(sl.start), fin: minToTime(sl.end), plage });
    }
  }
  return slots;
}

export async function generateEmploiDuTemps(opts: GenerateOptions): Promise<GenerateReport> {
  const t0 = Date.now();

  // 1. Charge données
  const [cmRes, emRes, dispoRes, sallesRes, classesRes, matieresRes] = await Promise.all([
    supabase
      .from("classe_matieres")
      .select("classe_id, matiere_id, volume_horaire_hebdo")
      .eq("ecole_id", opts.ecoleId),
    supabase
      .from("enseignant_matieres")
      .select("enseignant_id, matiere_id, classe_id")
      .eq("ecole_id", opts.ecoleId),
    supabase
      .from("disponibilites_enseignants")
      .select("enseignant_id, jour, plage, disponible")
      .eq("ecole_id", opts.ecoleId),
    supabase
      .from("salles" as any)
      .select("id, code, nom")
      .eq("ecole_id", opts.ecoleId),
    supabase.from("classes").select("id, nom").eq("ecole_id", opts.ecoleId).eq("annee_id", opts.anneeId),
    supabase.from("matieres").select("id, nom").eq("ecole_id", opts.ecoleId),
  ]);

  // classe_matieres n'a pas de colonne annee_id propre (son "année" est
  // implicite via classe_id → classes.annee_id). On ne retient donc que les
  // affectations dont la classe appartient bien à l'année scolaire ciblée,
  // pour éviter de générer des créneaux annee_id=actif / classe_id=ancienne
  // année (bug constaté : cf. commit sur WeeklyView.tsx du 2026-08-13).
  const classesActivesIds = new Set((classesRes.data ?? []).map((c: any) => c.id));
  const classeMatieres = (cmRes.data ?? [])
    .filter((c: any) => (c.volume_horaire_hebdo ?? 0) > 0)
    .filter((c: any) => classesActivesIds.has(c.classe_id));
  const enseignantMat = (emRes.data ?? []) as any[];
  const dispos = (dispoRes.data ?? []) as any[];
  const salles = (sallesRes.data ?? []) as any[];
  const classeNom: Record<string, string> = Object.fromEntries((classesRes.data ?? []).map((c: any) => [c.id, c.nom]));
  const matiereNom: Record<string, string> = Object.fromEntries((matieresRes.data ?? []).map((m: any) => [m.id, m.nom]));

  // Index profs par matière (préférer ceux affectés à la classe)
  const profsParMatiere: Record<string, { id: string; classe_id: string | null }[]> = {};
  for (const em of enseignantMat) {
    (profsParMatiere[em.matiere_id] ||= []).push({ id: em.enseignant_id, classe_id: em.classe_id ?? null });
  }

  // Index indispos : key `${ens}-${jour}-${plage}` => true si NON dispo
  const indispo = new Set<string>();
  for (const d of dispos) {
    if (d.disponible === false) indispo.add(`${d.enseignant_id}-${d.jour}-${d.plage}`);
  }

  // 2. Optionnel: effacer
  if (!opts.dryRun && opts.effacerAvant) {
    await supabase
      .from("creneaux_emploi_temps" as any)
      .delete()
      .eq("ecole_id", opts.ecoleId)
      .eq("annee_id", opts.anneeId);
  }

  // 3. Charger créneaux existants pour ne pas écraser si on n'efface pas
  const { data: existants } = await supabase
    .from("creneaux_emploi_temps" as any)
    .select("classe_id, enseignant_id, salle_id, jour, heure_debut, heure_fin")
    .eq("ecole_id", opts.ecoleId)
    .eq("annee_id", opts.anneeId);

  const slotsTpl = buildSlotsTemplate(opts);

  // Adjacence chronologique des créneaux (même jour, même plage — la pause
  // déjeuner rompt volontairement la contiguïté matin/après-midi). Utilisée
  // uniquement quand opts.eviterTrous est actif, pour préférer prolonger un
  // bloc déjà commencé plutôt que d'ouvrir une heure isolée dans la journée.
  const adjacency = new Map<string, { prev: string | null; next: string | null }>();
  if (opts.eviterTrous) {
    const byDayPlage = new Map<string, typeof slotsTpl>();
    for (const s of slotsTpl) {
      const k = `${s.jour}-${s.plage}`;
      if (!byDayPlage.has(k)) byDayPlage.set(k, []);
      byDayPlage.get(k)!.push(s);
    }
    for (const arr of byDayPlage.values()) {
      arr.sort((a, b) => a.debut.localeCompare(b.debut));
      arr.forEach((s, i) => {
        const key = `${s.jour}|${s.debut}`;
        adjacency.set(key, {
          prev: i > 0 ? `${arr[i - 1].jour}|${arr[i - 1].debut}` : null,
          next: i < arr.length - 1 ? `${arr[i + 1].jour}|${arr[i + 1].debut}` : null,
        });
      });
    }
  }

  // Maps d'occupation
  const occClasse = new Map<string, Set<string>>(); // classe -> set("jour|heure")
  const occProf = new Map<string, Set<string>>();
  const occSalle = new Map<string, Set<string>>();
  const heuresJourClasse = new Map<string, Map<number, number>>(); // classe -> jour -> nb

  const mark = (occ: Map<string, Set<string>>, key: string, slotKey: string) => {
    if (!occ.has(key)) occ.set(key, new Set());
    occ.get(key)!.add(slotKey);
  };
  const isOcc = (occ: Map<string, Set<string>>, key: string, slotKey: string) =>
    occ.get(key)?.has(slotKey) ?? false;

  for (const c of (existants ?? []) as any[]) {
    const sk = `${c.jour}|${c.heure_debut}`;
    mark(occClasse, c.classe_id, sk);
    if (c.enseignant_id) mark(occProf, c.enseignant_id, sk);
    if (c.salle_id) mark(occSalle, c.salle_id, sk);
    const m = heuresJourClasse.get(c.classe_id) ?? new Map<number, number>();
    m.set(c.jour, (m.get(c.jour) ?? 0) + 1);
    heuresJourClasse.set(c.classe_id, m);
  }

  // 4. Placement glouton (matières lourdes d'abord, le matin)
  const taches = [...classeMatieres].sort(
    (a: any, b: any) => (b.volume_horaire_hebdo ?? 0) - (a.volume_horaire_hebdo ?? 0)
  );

  const aInserer: Creneau[] = [];
  const failed: GenerateReport["failed"] = [];
  let totalAttendu = 0;

  for (const tache of taches as any[]) {
    const need = Math.round(tache.volume_horaire_hebdo);
    totalAttendu += need;
    let placed = 0;
    let raison = "";

    const candidatsProf = (profsParMatiere[tache.matiere_id] ?? []).sort((a, b) => {
      // priorité : prof déjà rattaché à cette classe
      const aMatch = a.classe_id === tache.classe_id ? 0 : 1;
      const bMatch = b.classe_id === tache.classe_id ? 0 : 1;
      return aMatch - bMatch;
    });

    if (candidatsProf.length === 0) {
      raison = "aucun enseignant affecté à la matière";
    }

    // Ordre des slots : matières lourdes le matin si activé, sinon ordre naturel
    const matinLourd = opts.matinLourd !== false;
    const slotsOrdonnes = [...slotsTpl].sort((a, b) => {
      if (matinLourd && a.plage !== b.plage) return a.plage === "matin" ? -1 : 1;
      if (a.jour !== b.jour) return a.jour - b.jour;
      return a.debut.localeCompare(b.debut);
    });


    // Tente de placer une heure de la tâche sur `slot`. Retourne true si
    // effectivement placée (contraintes dures respectées), false sinon.
    const tryPlace = (slot: (typeof slotsOrdonnes)[number]): boolean => {
      const sk = `${slot.jour}|${slot.debut}`;

      // Limite heures/jour pour la classe
      const m = heuresJourClasse.get(tache.classe_id) ?? new Map<number, number>();
      if ((m.get(slot.jour) ?? 0) >= opts.heuresParJourMax) return false;

      // Classe libre ?
      if (isOcc(occClasse, tache.classe_id, sk)) return false;

      // Trouver un prof
      let chosenProf: string | null = null;
      for (const p of candidatsProf) {
        if (isOcc(occProf, p.id, sk)) continue;
        if (opts.respectDispo && indispo.has(`${p.id}-${slot.jour}-${slot.plage}`)) continue;
        chosenProf = p.id;
        break;
      }
      if (candidatsProf.length > 0 && !chosenProf) return false;

      // Trouver une salle libre
      let chosenSalle: { id: string; code: string | null; nom: string } | null = null;
      for (const s of salles) {
        if (!isOcc(occSalle, s.id, sk)) {
          chosenSalle = s;
          break;
        }
      }

      // Réserver
      mark(occClasse, tache.classe_id, sk);
      if (chosenProf) mark(occProf, chosenProf, sk);
      if (chosenSalle) mark(occSalle, chosenSalle.id, sk);
      m.set(slot.jour, (m.get(slot.jour) ?? 0) + 1);
      heuresJourClasse.set(tache.classe_id, m);

      aInserer.push({
        ecole_id: opts.ecoleId,
        annee_id: opts.anneeId,
        classe_id: tache.classe_id,
        matiere_id: tache.matiere_id,
        enseignant_id: chosenProf,
        jour: slot.jour,
        heure_debut: slot.debut,
        heure_fin: slot.fin,
        salle_id: chosenSalle?.id ?? null,
        salle: chosenSalle?.code ?? chosenSalle?.nom ?? null,
      });
      placed++;
      return true;
    };

    if (opts.eviterTrous) {
      // Passe 1 : ne place que sur des créneaux qui prolongent un bloc déjà
      // commencé ce jour-là pour cette classe (adjacent à une heure déjà
      // occupée), ou qui ouvrent une première heure sur un jour encore vide
      // (sinon aucune heure ne pourrait jamais démarrer un bloc).
      for (const slot of slotsOrdonnes) {
        if (placed >= need) break;
        const sk = `${slot.jour}|${slot.debut}`;
        const adj = adjacency.get(sk);
        const isAdjacent = !!(
          adj && ((adj.prev && isOcc(occClasse, tache.classe_id, adj.prev)) ||
                  (adj.next && isOcc(occClasse, tache.classe_id, adj.next)))
        );
        const classeDejaCeJour = ((heuresJourClasse.get(tache.classe_id)?.get(slot.jour)) ?? 0) > 0;
        if (classeDejaCeJour && !isAdjacent) continue;
        tryPlace(slot);
      }
      // Passe 2 (repli) : comble le volume restant sans la préférence de
      // contiguïté, pour ne jamais placer moins d'heures qu'avant ce réglage.
      if (placed < need) {
        for (const slot of slotsOrdonnes) {
          if (placed >= need) break;
          tryPlace(slot);
        }
      }
    } else {
      for (const slot of slotsOrdonnes) {
        if (placed >= need) break;
        tryPlace(slot);
      }
    }

    if (placed < need) {
      failed.push({
        classe: classeNom[tache.classe_id] ?? tache.classe_id,
        matiere: matiereNom[tache.matiere_id] ?? tache.matiere_id,
        manquant: need - placed,
        raison: raison || "plus de créneaux disponibles compatibles",
      });
    }
  }

  // 5. Insertion
  let inserted = 0;
  if (!opts.dryRun && aInserer.length > 0) {
    // Chunk
    for (let i = 0; i < aInserer.length; i += 500) {
      const chunk = aInserer.slice(i, i + 500);
      const { error, count } = await supabase
        .from("creneaux_emploi_temps" as any)
        .insert(chunk as any, { count: "exact" });
      if (error) throw error;
      inserted += count ?? chunk.length;
    }
  } else {
    inserted = aInserer.length;
  }

  return {
    placed: inserted,
    failed,
    conflits: 0,
    duree_ms: Date.now() - t0,
    totalAttendu,
  };
}
