import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return toast.warning("Aucune donnée à exporter");
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => {
    const v = r[h] ?? "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success("Export téléchargé");
}

export default function SubjectsReports() {
  const { ecoleId } = useEcoleId();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (!ecoleId) return;
    setBusy(key); try { await fn(); } catch (e: any) { toast.error(e?.message || "Erreur"); } finally { setBusy(null); }
  };

  const reports = [
    {
      key: "catalogue", titre: "Catalogue des matières", desc: "Liste complète avec catégorie, coefficient et barème.",
      run: () => run("catalogue", async () => {
        const { data } = await supabase.from("matieres").select("code, nom, categorie, coefficient, note_sur, note_passage, active").eq("ecole_id", ecoleId!).order("nom");
        downloadCSV("catalogue_matieres.csv", data ?? []);
      }),
    },
    {
      key: "volumes", titre: "Volumes horaires par classe", desc: "Heures hebdomadaires de chaque matière par classe.",
      run: () => run("volumes", async () => {
        const { data } = await supabase.from("classe_matieres").select("classes(nom), matieres(nom, code), coefficient, volume_horaire_hebdo").eq("ecole_id", ecoleId!);
        const rows = (data ?? []).map((r: any) => ({ classe: r.classes?.nom, matiere: r.matieres?.nom, code: r.matieres?.code, coefficient: r.coefficient, heures_hebdo: r.volume_horaire_hebdo }));
        downloadCSV("volumes_horaires.csv", rows);
      }),
    },
    {
      key: "affectations", titre: "Affectations enseignants / matières", desc: "Qui enseigne quoi dans quelle classe.",
      run: () => run("affectations", async () => {
        const { data } = await supabase.from("enseignant_matieres").select("enseignants(nom, prenom), matieres(nom, code), classes(nom)").eq("ecole_id", ecoleId!);
        const rows = (data ?? []).map((r: any) => ({ enseignant: r.enseignants ? `${r.enseignants.prenom} ${r.enseignants.nom}` : "", matiere: r.matieres?.nom, code: r.matieres?.code, classe: r.classes?.nom || "—" }));
        downloadCSV("affectations_enseignants.csv", rows);
      }),
    },
    {
      key: "progressions", titre: "Avancement des programmes", desc: "Suivi pédagogique par matière, classe et période.",
      run: () => run("progressions", async () => {
        const { data } = await supabase.from("progressions_matiere").select("matieres(nom, code), classes(nom), periode, chapitres_total, chapitres_faits").eq("ecole_id", ecoleId!);
        const rows = (data ?? []).map((r: any) => ({ matiere: r.matieres?.nom, code: r.matieres?.code, classe: r.classes?.nom || "Toutes", periode: r.periode, chapitres_total: r.chapitres_total, chapitres_faits: r.chapitres_faits, pourcentage: r.chapitres_total ? Math.round((r.chapitres_faits / r.chapitres_total) * 100) : 0 }));
        downloadCSV("progressions.csv", rows);
      }),
    },
    {
      key: "coefficients", titre: "Coefficients par matière", desc: "Pondérations utilisées pour les bulletins.",
      run: () => run("coefficients", async () => {
        const { data } = await supabase.from("matieres").select("code, nom, categorie, coefficient, note_sur").eq("ecole_id", ecoleId!).order("categorie").order("nom");
        downloadCSV("coefficients.csv", data ?? []);
      }),
    },
  ];

  return (
    <SettingsSection icon={<FileBarChart className="h-5 w-5" />} title="Rapports" description="Documents officiels et exports relatifs aux matières." hideSave>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="border">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">{r.titre}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-muted">CSV</span>
              </div>
              <Button variant="outline" size="sm" onClick={r.run} disabled={busy === r.key}>
                {busy === r.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
