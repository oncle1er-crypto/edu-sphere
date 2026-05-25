import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";
import { useState } from "react";

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return s.includes(",") || s.includes("\"") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ClassesReports() {
  const { classes, loading: lc } = useClasses();
  const { eleves, loading: le } = useEleves();
  const { enseignants, loading: lt } = useEnseignants();
  const [busy, setBusy] = useState<string | null>(null);

  const loading = lc || le || lt;

  const handle = async (key: string) => {
    setBusy(key);
    try {
      if (key === "liste") {
        const rows: any[][] = [["Classe", "Matricule", "Nom", "Prénom", "Sexe", "Date naissance"]];
        classes.forEach((c) => {
          eleves.filter((e) => e.classe_id === c.id).forEach((e) => {
            rows.push([c.nom, e.matricule ?? "", e.nom, e.prenom, e.sexe ?? "", e.date_naissance ?? ""]);
          });
        });
        downloadCSV("liste_nominative_classes.csv", rows);
      } else if (key === "effectifs") {
        const rows: any[][] = [["Cycle", "Classe", "Garçons", "Filles", "Total", "Capacité"]];
        classes.forEach((c) => {
          const list = eleves.filter((e) => e.classe_id === c.id);
          const g = list.filter((e) => e.sexe === "M").length;
          const f = list.filter((e) => e.sexe === "F").length;
          rows.push([c.cycle_nom ?? "", c.nom, g, f, list.length, c.capacite ?? ""]);
        });
        downloadCSV("effectifs_par_cycle.csv", rows);
      } else if (key === "remplissage") {
        const rows: any[][] = [["Classe", "Effectif", "Capacité", "Taux (%)"]];
        classes.forEach((c) => {
          const eff = c.effectif ?? 0;
          const cap = c.capacite ?? 0;
          rows.push([c.nom, eff, cap, cap > 0 ? Math.round((eff / cap) * 100) : 0]);
        });
        downloadCSV("taux_remplissage.csv", rows);
      } else if (key === "salles") {
        const rows: any[][] = [["Classe", "Salle", "Effectif", "Capacité"]];
        classes.forEach((c) => rows.push([c.nom, c.salle ?? "—", c.effectif ?? 0, c.capacite ?? ""]));
        downloadCSV("affectation_salles.csv", rows);
      } else if (key === "profs") {
        const rows: any[][] = [["Classe", "Cycle", "Prof. principal", "Effectif"]];
        classes.forEach((c) => rows.push([c.nom, c.cycle_nom ?? "", c.prof_nom || "—", c.effectif ?? 0]));
        downloadCSV("profs_principaux.csv", rows);
      } else if (key === "enseignants") {
        const rows: any[][] = [["Matricule", "Nom", "Prénom", "Spécialité", "Statut"]];
        enseignants.forEach((e) => rows.push([e.matricule ?? "", e.nom, e.prenom, e.specialite ?? "", e.statut ?? ""]));
        downloadCSV("liste_enseignants.csv", rows);
      }
      toast.success("Rapport téléchargé");
    } catch (err: any) {
      toast.error("Erreur génération: " + err.message);
    } finally {
      setBusy(null);
    }
  };

  const reports = [
    { key: "liste", titre: "Liste nominative par classe", desc: "Élèves de chaque classe avec coordonnées" },
    { key: "effectifs", titre: "Effectifs détaillés par cycle", desc: "Garçons / filles / total par classe" },
    { key: "remplissage", titre: "Taux de remplissage", desc: "Capacité vs effectif réel par classe" },
    { key: "salles", titre: "Affectation des salles", desc: "Salle assignée à chaque classe" },
    { key: "profs", titre: "Liste des professeurs principaux", desc: "Avec classe et effectif géré" },
    { key: "enseignants", titre: "Liste des enseignants", desc: "Annuaire complet du personnel pédagogique" },
  ];

  return (
    <SettingsSection
      icon={<FileBarChart className="h-5 w-5" />}
      title="Rapports"
      description="Exports CSV (compatibles Excel) sur l'organisation pédagogique."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.key} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
              <Button variant="outline" size="sm" disabled={loading || busy === r.key} onClick={() => handle(r.key)}>
                {busy === r.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
