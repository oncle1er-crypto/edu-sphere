import {
  generatePVDeliberation,
  generateReleveNotes,
  generateStatsMatieres,
  generatePalmares,
  generateEvolutionMoyennes,
  generateDecisionsFinAnnee,
} from "@/lib/reports/examensReports";

export type ReportType =
  | "pv"
  | "releve"
  | "stats"
  | "palmares"
  | "evolution"
  | "decisions";

type Runner = (ecoleId: string, params: any) => Promise<void>;

export const reportRegistry: Record<ReportType, Runner> = {
  pv:        (e, p) => generatePVDeliberation(e, p.classeId, p.periodeId),
  releve:    (e, p) => generateReleveNotes(e, p.eleveId, p.periodeId),
  stats:     (e, p) => generateStatsMatieres(e, p.periodeId),
  palmares:  (e, p) => generatePalmares(e, p.periodeId, p.classeId || undefined),
  evolution: (e, p) => generateEvolutionMoyennes(e, p.anneeId, p.classeId),
  decisions: (e, p) => generateDecisionsFinAnnee(e, p.anneeId, p.classeId || undefined),
};
