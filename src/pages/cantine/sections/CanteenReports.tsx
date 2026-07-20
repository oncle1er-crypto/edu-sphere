import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const toCSV = (rows: Record<string, any>[]) => {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};
const downloadFile = (name: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export default function CanteenReports() {
  const { ecoleId } = useEcoleId();
  const [busy, setBusy] = useState<string | null>(null);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast.error(e?.message ?? "Erreur export"); }
    finally { setBusy(null); }
  };

  const exportAbonnes = () => withBusy("abo", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("abonnements_cantine").select("regime, statut, montant_mensuel, eleves(nom, prenom, classes(nom))").eq("ecole_id", ecoleId);
    const rows = ((data ?? []) as any[]).map((r) => ({
      Eleve: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
      Classe: r.eleves?.classes?.nom ?? "",
      Regime: r.regime, Statut: r.statut, Montant_mensuel: r.montant_mensuel,
    }));
    if (rows.length === 0) { toast.info("Aucun abonné à exporter"); return; }
    downloadFile("abonnes-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportFactures = () => withBusy("fac", async () => {
    if (!ecoleId) return;
    const first = new Date(); first.setDate(1);
    const { data } = await supabase.from("factures").select("numero, libelle, montant, montant_paye, statut, date_emission, eleves(nom, prenom)").eq("ecole_id", ecoleId).eq("categorie", "cantine").gte("date_emission", first.toISOString().slice(0, 10));
    const rows = ((data ?? []) as any[]).map((f) => ({
      Numero: f.numero, Eleve: `${f.eleves?.nom ?? ""} ${f.eleves?.prenom ?? ""}`.trim(),
      Libelle: f.libelle, Montant: f.montant, Paye: f.montant_paye, Statut: f.statut, Date: f.date_emission,
    }));
    if (rows.length === 0) { toast.info("Aucune facture ce mois-ci"); return; }
    downloadFile("factures-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportStock = () => withBusy("stock", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("stocks_cantine").select("*").eq("ecole_id", ecoleId);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) { toast.info("Stock vide"); return; }
    downloadFile("inventaire-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportMenus = () => withBusy("menu", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("menus_cantine").select("*").eq("ecole_id", ecoleId);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) { toast.info("Aucun menu"); return; }
    downloadFile("menus-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportSynthese = () => withBusy("synth", async () => {
    if (!ecoleId) return;
    const first = new Date(); first.setDate(1);
    const { data } = await supabase.from("factures").select("montant, montant_paye").eq("ecole_id", ecoleId).eq("categorie", "cantine").gte("date_emission", first.toISOString().slice(0, 10));
    const rows = (data ?? []) as any[];
    const facture = rows.reduce((s, r) => s + Number(r.montant || 0), 0);
    const encaisse = rows.reduce((s, r) => s + Number(r.montant_paye || 0), 0);
    downloadFile("synthese-cantine.csv", "text/csv;charset=utf-8",
      `Indicateur,Valeur\nMois,${first.toISOString().slice(0,7)}\nFactures émises,${rows.length}\nMontant facturé,${facture}\nMontant encaissé,${encaisse}\nImpayés,${facture - encaisse}\n`);
    toast.success("Synthèse téléchargée");
  });

  const items = [
    { key: "abo", title: "Liste des abonnés (CSV)", desc: "Export complet par formule.", onClick: exportAbonnes },
    { key: "fac", title: "Factures du mois (CSV)", desc: "Factures cantine du mois en cours.", onClick: exportFactures },
    { key: "menu", title: "Menus (CSV)", desc: "Tous les menus enregistrés.", onClick: exportMenus },
    { key: "stock", title: "Inventaire stock (CSV)", desc: "État détaillé du stock cantine.", onClick: exportStock },
    { key: "synth", title: "Synthèse financière (CSV)", desc: "Recettes et impayés du mois.", onClick: exportSynthese },
    { key: "haccp", title: "Rapport HACCP", desc: "Nécessite un module HACCP dédié (à venir).", onClick: () => toast.info("Module HACCP non disponible"), disabled: true },
  ];

  return (
    <SettingsSection title="Rapports & exports" description="Documents disponibles au téléchargement." icon={<FileText className="h-5 w-5" />} hideSave>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((e) => (
          <Card key={e.key}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{e.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={e.onClick} disabled={e.disabled || busy === e.key}>
                  {busy === e.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Télécharger
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
