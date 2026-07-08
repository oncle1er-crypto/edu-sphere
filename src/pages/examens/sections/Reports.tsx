import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useClasses } from "@/hooks/useClasses";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { enqueueReport } from "@/lib/reportQueue";
import type { ReportType } from "@/lib/reports/registry";

type ReportKey = ReportType;

const REPORTS: { key: ReportKey; titre: string; desc: string; format: string; needs: ("classe" | "periode" | "eleve" | "annee")[] }[] = [
  { key: "pv",        titre: "Procès-verbal de délibération", desc: "PV complet par classe et période",     format: "PDF",   needs: ["classe", "periode"] },
  { key: "releve",    titre: "Relevés de notes individuels",  desc: "Détail des notes par élève",           format: "PDF",   needs: ["eleve", "periode"] },
  { key: "stats",     titre: "Statistiques par matière",      desc: "Moyennes, min/max, taux de réussite", format: "Excel", needs: ["periode"] },
  { key: "palmares",  titre: "Palmarès trimestriel",          desc: "Top 30 des meilleures moyennes",       format: "PDF",   needs: ["periode", "classe"] },
  { key: "evolution", titre: "Rapport d'évolution",           desc: "Moyennes par période et par élève",    format: "Excel", needs: ["classe"] },
  { key: "decisions", titre: "Liste des admis/redoublants",   desc: "Décisions de fin d'année",             format: "PDF",   needs: ["classe"] },
];

export default function Reports() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { classes } = useClasses(anneeId ?? undefined);
  const { activeAnnee } = useAcademicPeriod();
  const periodes = activeAnnee?.periodes ?? [];

  const [active, setActive] = useState<ReportKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<{ classe: string; periode: string; eleve: string }>({ classe: "", periode: "", eleve: "" });
  const [eleves, setEleves] = useState<{ id: string; nom: string; prenom: string }[]>([]);

  const openDialog = async (key: ReportKey) => {
    setActive(key);
    setFilters({ classe: "", periode: "", eleve: "" });
    // charger la liste d'élèves si nécessaire
    if (REPORTS.find((r) => r.key === key)?.needs.includes("eleve") && ecoleId && anneeId) {
      const { data } = await supabase
        .from("eleves")
        .select("id, nom, prenom")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId)
        .order("nom");
      setEleves(data ?? []);
    }
  };

  const activeReport = REPORTS.find((r) => r.key === active);
  const canRun = (() => {
    if (!activeReport || !ecoleId) return false;
    const need = activeReport.needs;
    if (need.includes("classe") && !filters.classe) return false;
    if (need.includes("periode") && !filters.periode) return false;
    if (need.includes("eleve") && !filters.eleve) return false;
    if (need.includes("annee") && !anneeId) return false;
    return true;
  })();

  const run = () => {
    if (!activeReport || !ecoleId) return;
    setBusy(true);
    const key = activeReport.key;
    const label = activeReport.titre;
  const run = async () => {
    if (!activeReport || !ecoleId) return;
    setBusy(true);
    try {
      const paramsMap: Record<ReportKey, Record<string, any>> = {
        pv:        { classeId: filters.classe, periodeId: filters.periode },
        releve:    { eleveId: filters.eleve, periodeId: filters.periode },
        stats:     { periodeId: filters.periode },
        palmares:  { periodeId: filters.periode, classeId: filters.classe },
        evolution: { anneeId, classeId: filters.classe },
        decisions: { anneeId, classeId: filters.classe },
      };
      await enqueueReport({
        ecoleId,
        type: activeReport.key,
        label: activeReport.titre,
        params: paramsMap[activeReport.key],
      });
      toast.success("Rapport ajouté à la file d'attente");
      setActive(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection
      icon={<FileSpreadsheet className="h-5 w-5" />}
      title="Rapports pédagogiques"
      description="Documents officiels générés à partir des données réelles de l'établissement."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map((r) => (
          <Card key={r.key} className="border">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.titre}</p>
                <p className="text-xs text-muted-foreground">{r.desc} · {r.format}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => openDialog(r.key)}>
                <Download className="h-3.5 w-3.5" /> Générer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeReport?.titre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {activeReport?.needs.includes("classe") && (
              <div>
                <Label>Classe {activeReport.key === "palmares" ? "(optionnel)" : "*"}</Label>
                <Select value={filters.classe} onValueChange={(v) => setFilters((f) => ({ ...f, classe: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeReport?.needs.includes("periode") && (
              <div>
                <Label>Période *</Label>
                <Select value={filters.periode} onValueChange={(v) => setFilters((f) => ({ ...f, periode: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir une période" /></SelectTrigger>
                  <SelectContent>
                    {periodes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeReport?.needs.includes("eleve") && (
              <div>
                <Label>Élève *</Label>
                <Select value={filters.eleve} onValueChange={(v) => setFilters((f) => ({ ...f, eleve: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                  <SelectContent>
                    {eleves.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Annuler</Button>
            <Button onClick={run} disabled={!canRun || busy}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Génération…</> : <><Download className="h-4 w-4" />Générer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
