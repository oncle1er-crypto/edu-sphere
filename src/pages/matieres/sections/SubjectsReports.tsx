import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

export default function SubjectsReports() {
  const { ecoleId } = useEcoleId();
  const ecole = useEcoleInfo();

  const reports = [
    {
      key: "catalogue",
      titre: "Catalogue des matières",
      desc: "Liste complète avec catégorie, coefficient et barème.",
      filename: "catalogue_matieres",
      columns: ["Code", "Nom", "Catégorie", "Coefficient", "Note sur", "Note passage", "Active"],
      getRows: async () => {
        const { data } = await supabase.from("matieres")
          .select("code, nom, categorie, coefficient, note_sur, note_passage, active")
          .eq("ecole_id", ecoleId!).order("nom");
        return (data ?? []).map((r: any) => [r.code, r.nom, r.categorie, r.coefficient, r.note_sur, r.note_passage, r.active ? "Oui" : "Non"]);
      },
    },
    {
      key: "volumes",
      titre: "Volumes horaires par classe",
      desc: "Heures hebdomadaires de chaque matière par classe.",
      filename: "volumes_horaires",
      columns: ["Classe", "Matière", "Code", "Coefficient", "Heures hebdo"],
      getRows: async () => {
        const { data } = await supabase.from("classe_matieres")
          .select("classes(nom), matieres(nom, code), coefficient, volume_horaire_hebdo")
          .eq("ecole_id", ecoleId!);
        return (data ?? []).map((r: any) => [r.classes?.nom, r.matieres?.nom, r.matieres?.code, r.coefficient, r.volume_horaire_hebdo]);
      },
    },
    {
      key: "affectations",
      titre: "Affectations enseignants / matières",
      desc: "Qui enseigne quoi dans quelle classe.",
      filename: "affectations_enseignants",
      columns: ["Enseignant", "Matière", "Code", "Classe"],
      getRows: async () => {
        const { data } = await supabase.from("enseignant_matieres")
          .select("enseignants(nom, prenom), matieres(nom, code), classes(nom)")
          .eq("ecole_id", ecoleId!);
        return (data ?? []).map((r: any) => [
          r.enseignants ? `${r.enseignants.nom} ${r.enseignants.prenom}` : "",
          r.matieres?.nom, r.matieres?.code, r.classes?.nom || "—",
        ]);
      },
    },
    {
      key: "progressions",
      titre: "Avancement des programmes",
      desc: "Suivi pédagogique par matière, classe et période.",
      filename: "progressions",
      columns: ["Matière", "Code", "Classe", "Période", "Chapitres total", "Chapitres faits", "%"],
      getRows: async () => {
        const { data } = await supabase.from("progressions_matiere")
          .select("matieres(nom, code), classes(nom), periode, chapitres_total, chapitres_faits")
          .eq("ecole_id", ecoleId!);
        return (data ?? []).map((r: any) => [
          r.matieres?.nom, r.matieres?.code, r.classes?.nom || "Toutes", r.periode,
          r.chapitres_total, r.chapitres_faits,
          r.chapitres_total ? Math.round((r.chapitres_faits / r.chapitres_total) * 100) : 0,
        ]);
      },
    },
    {
      key: "coefficients",
      titre: "Coefficients par matière",
      desc: "Pondérations utilisées pour les bulletins.",
      filename: "coefficients",
      columns: ["Code", "Nom", "Catégorie", "Coefficient", "Note sur"],
      getRows: async () => {
        const { data } = await supabase.from("matieres")
          .select("code, nom, categorie, coefficient, note_sur")
          .eq("ecole_id", ecoleId!).order("categorie").order("nom");
        return (data ?? []).map((r: any) => [r.code, r.nom, r.categorie, r.coefficient, r.note_sur]);
      },
    },
  ];

  return (
    <SettingsSection icon={<FileBarChart className="h-5 w-5" />} title="Rapports" description="Documents officiels sur les matières (CSV · Excel · PDF)." hideSave>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="border">
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-sm">{r.titre}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              </div>
              <ReportExportButtons
                title={r.titre}
                filename={r.filename}
                columns={r.columns}
                getRows={r.getRows}
                ecole={ecole}
                disabled={!ecoleId}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
