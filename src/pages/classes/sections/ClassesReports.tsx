import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { useEnseignants } from "@/hooks/useEnseignants";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

export default function ClassesReports() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading: lc } = useClasses(activeAnnee.id);
  const { eleves, loading: le } = useEleves(activeAnnee.id);
  const { enseignants, loading: lt } = useEnseignants();
  const ecole = useEcoleInfo();
  const loading = lc || le || lt;

  const reports = [
    {
      key: "liste",
      titre: "Liste nominative par classe",
      desc: "Élèves de chaque classe avec coordonnées",
      filename: "liste_nominative_classes",
      columns: ["Classe", "Matricule", "Nom", "Prénom", "Sexe", "Date naissance"],
      getRows: () => {
        const rows: (string | number)[][] = [];
        classes.forEach((c) => {
          eleves.filter((e) => e.classe_id === c.id).forEach((e) => {
            rows.push([c.nom, e.matricule ?? "", e.nom, e.prenom, e.sexe ?? "", e.date_naissance ?? ""]);
          });
        });
        return rows;
      },
    },
    {
      key: "effectifs",
      titre: "Effectifs détaillés par cycle",
      desc: "Garçons / filles / total par classe",
      filename: "effectifs_par_cycle",
      columns: ["Cycle", "Classe", "Garçons", "Filles", "Total", "Capacité"],
      getRows: () => classes.map((c) => {
        const list = eleves.filter((e) => e.classe_id === c.id);
        const g = list.filter((e) => e.sexe === "M").length;
        const f = list.filter((e) => e.sexe === "F").length;
        return [c.cycle_nom ?? "", c.nom, g, f, list.length, c.capacite ?? ""];
      }),
    },
    {
      key: "remplissage",
      titre: "Taux de remplissage",
      desc: "Capacité vs effectif réel par classe",
      filename: "taux_remplissage",
      columns: ["Classe", "Effectif", "Capacité", "Taux (%)"],
      getRows: () => classes.map((c) => {
        const eff = c.effectif ?? 0;
        const cap = c.capacite ?? 0;
        return [c.nom, eff, cap, cap > 0 ? Math.round((eff / cap) * 100) : 0];
      }),
    },
    {
      key: "salles",
      titre: "Affectation des salles",
      desc: "Salle assignée à chaque classe",
      filename: "affectation_salles",
      columns: ["Classe", "Salle", "Effectif", "Capacité"],
      getRows: () => classes.map((c) => [c.nom, c.salle ?? "—", c.effectif ?? 0, c.capacite ?? ""]),
    },
    {
      key: "profs",
      titre: "Liste des professeurs principaux",
      desc: "Avec classe et effectif géré",
      filename: "profs_principaux",
      columns: ["Classe", "Cycle", "Prof. principal", "Effectif"],
      getRows: () => classes.map((c) => [c.nom, c.cycle_nom ?? "", c.prof_nom || "—", c.effectif ?? 0]),
    },
    {
      key: "enseignants",
      titre: "Liste des enseignants",
      desc: "Annuaire complet du personnel pédagogique",
      filename: "liste_enseignants",
      columns: ["Matricule", "Nom", "Prénom", "Spécialité", "Statut"],
      getRows: () => enseignants.map((e) => [e.matricule ?? "", e.nom, e.prenom, e.specialite ?? "", e.statut ?? ""]),
    },
  ];

  return (
    <SettingsSection
      icon={<FileBarChart className="h-5 w-5" />}
      title="Rapports"
      description="Exports (CSV · Excel · PDF) sur l'organisation pédagogique."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.key} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium">{r.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
              <ReportExportButtons
                title={r.titre}
                filename={r.filename}
                columns={r.columns}
                getRows={r.getRows}
                ecole={ecole}
                disabled={loading}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
