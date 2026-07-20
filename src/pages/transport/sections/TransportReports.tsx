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

export default function TransportReports() {
  const { ecoleId } = useEcoleId();
  const [busy, setBusy] = useState<string | null>(null);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast.error(e?.message ?? "Erreur export"); }
    finally { setBusy(null); }
  };

  const exportAbonnes = () => withBusy("abo", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("abonnements_transport").select("statut, lignes_transport(nom), eleves(nom, prenom, classes(nom))").eq("ecole_id", ecoleId);
    const rows = ((data ?? []) as any[]).map((r) => ({
      Eleve: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
      Classe: r.eleves?.classes?.nom ?? "",
      Ligne: r.lignes_transport?.nom ?? "", Statut: r.statut,
    }));
    if (rows.length === 0) { toast.info("Aucun abonné à exporter"); return; }
    downloadFile("abonnes-transport.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportFactures = () => withBusy("fac", async () => {
    if (!ecoleId) return;
    const first = new Date(); first.setDate(1);
    const { data } = await supabase.from("factures").select("numero, libelle, montant, montant_paye, statut, date_emission, eleves(nom, prenom)").eq("ecole_id", ecoleId).eq("categorie", "transport").gte("date_emission", first.toISOString().slice(0, 10));
    const rows = ((data ?? []) as any[]).map((f) => ({
      Numero: f.numero, Eleve: `${f.eleves?.nom ?? ""} ${f.eleves?.prenom ?? ""}`.trim(),
      Libelle: f.libelle, Montant: f.montant, Paye: f.montant_paye, Statut: f.statut, Date: f.date_emission,
    }));
    if (rows.length === 0) { toast.info("Aucune facture ce mois-ci"); return; }
    downloadFile("factures-transport.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportCarburant = () => withBusy("carb", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("transport_carburant" as any).select("date_plein, litres, prix_litre, montant, km_compteur, vehicules(immatriculation)").eq("ecole_id", ecoleId);
    const rows = ((data as any).data ?? (data as any) ?? []).map((r: any) => ({
      Date: r.date_plein, Vehicule: r.vehicules?.immatriculation ?? "",
      Litres: r.litres, Prix_L: r.prix_litre, Montant: r.montant, Km: r.km_compteur,
    }));
    if (rows.length === 0) { toast.info("Aucun plein enregistré"); return; }
    downloadFile("carburant.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportMaintenance = () => withBusy("main", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("transport_maintenance" as any).select("date_operation, type, cout, garage, prochaine_echeance_date, vehicules(immatriculation)").eq("ecole_id", ecoleId);
    const rows = ((data as any) ?? []).map((r: any) => ({
      Date: r.date_operation, Vehicule: r.vehicules?.immatriculation ?? "",
      Type: r.type, Cout: r.cout, Garage: r.garage, Prochaine_echeance: r.prochaine_echeance_date,
    }));
    if (rows.length === 0) { toast.info("Aucune maintenance enregistrée"); return; }
    downloadFile("maintenance.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportSynthese = () => withBusy("synth", async () => {
    if (!ecoleId) return;
    const first = new Date(); first.setDate(1);
    const [{ data: fac }, { data: carb }, { data: maint }] = await Promise.all([
      supabase.from("factures").select("montant, montant_paye").eq("ecole_id", ecoleId).eq("categorie", "transport").gte("date_emission", first.toISOString().slice(0, 10)),
      supabase.from("transport_carburant" as any).select("montant").eq("ecole_id", ecoleId).gte("date_plein", first.toISOString().slice(0, 10)),
      supabase.from("transport_maintenance" as any).select("cout").eq("ecole_id", ecoleId).gte("date_operation", first.toISOString().slice(0, 10)),
    ]);
    const facture = ((fac ?? []) as any[]).reduce((s, r) => s + Number(r.montant || 0), 0);
    const encaisse = ((fac ?? []) as any[]).reduce((s, r) => s + Number(r.montant_paye || 0), 0);
    const carbTotal = (((carb as any) ?? []) as any[]).reduce((s, r) => s + Number(r.montant || 0), 0);
    const mainTotal = (((maint as any) ?? []) as any[]).reduce((s, r) => s + Number(r.cout || 0), 0);
    downloadFile("synthese-transport.csv", "text/csv;charset=utf-8",
      `Indicateur,Valeur\nMois,${first.toISOString().slice(0,7)}\nMontant facturé,${facture}\nMontant encaissé,${encaisse}\nImpayés,${facture - encaisse}\nCarburant,${carbTotal}\nMaintenance,${mainTotal}\nMarge,${encaisse - carbTotal - mainTotal}\n`);
    toast.success("Synthèse téléchargée");
  });

  const items = [
    { key: "abo", title: "Liste des abonnés (CSV)", desc: "Export par ligne et statut.", onClick: exportAbonnes },
    { key: "fac", title: "Factures du mois (CSV)", desc: "Factures transport du mois en cours.", onClick: exportFactures },
    { key: "carb", title: "Consommation carburant (CSV)", desc: "Détail des pleins par véhicule.", onClick: exportCarburant },
    { key: "main", title: "Maintenance (CSV)", desc: "Historique des entretiens.", onClick: exportMaintenance },
    { key: "synth", title: "Synthèse financière (CSV)", desc: "Recettes / dépenses / marge.", onClick: exportSynthese },
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
                <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={e.onClick} disabled={busy === e.key}>
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
