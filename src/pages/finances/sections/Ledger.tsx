import { FileSpreadsheet, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

interface EcritureComptable {
  date: string;
  account: string;
  label: string;
  debit: number;
  credit: number;
}

export default function Ledger() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }

    Promise.all([
      supabase.from("paiements").select("montant, date_paiement, mode, reference, eleves(nom, prenom)").eq("ecole_id", ecoleId).order("date_paiement", { ascending: false }).limit(30),
      supabase.from("depenses").select("montant, date_depense, libelle, categorie").eq("ecole_id", ecoleId).eq("statut", "validee").order("date_depense", { ascending: false }).limit(30),
    ]).then(([pRes, dRes]) => {
      const entries: EcritureComptable[] = [];

      (pRes.data ?? []).forEach((p: any) => {
        const nom = p.eleves ? `${p.eleves.nom} ${p.eleves.prenom}` : "Scolarité";
        entries.push({ date: p.date_paiement, account: "411 - Clients", label: nom, debit: Number(p.montant), credit: 0 });
        entries.push({ date: p.date_paiement, account: "706 - Prestations services", label: "Scolarité", debit: 0, credit: Number(p.montant) });
      });

      (dRes.data ?? []).forEach((d: any) => {
        const compte = d.categorie?.includes("nergie") ? "606 - Énergie" : d.categorie?.includes("alaire") ? "641 - Salaires" : "601 - Achats";
        entries.push({ date: d.date_depense, account: compte, label: d.libelle, debit: Number(d.montant), credit: 0 });
        entries.push({ date: d.date_depense, account: "401 - Fournisseurs", label: d.libelle, debit: 0, credit: Number(d.montant) });
      });

      entries.sort((a, b) => b.date.localeCompare(a.date));
      setEcritures(entries.slice(0, 50));
      setLoading(false);
    });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Grand livre comptable (${ecritures.length} écritures)`} description="Écritures comptables générées automatiquement (plan OHADA)." icon={<FileSpreadsheet className="h-5 w-5" />} hideSave>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Débit</TableHead>
              <TableHead className="text-right">Crédit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecritures.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground text-xs">{new Date(e.date).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="font-mono text-xs">{e.account}</TableCell>
                <TableCell className="text-muted-foreground">{e.label}</TableCell>
                <TableCell className="text-right font-semibold">{e.debit > 0 ? e.debit.toLocaleString("fr-FR") : ""}</TableCell>
                <TableCell className="text-right font-semibold">{e.credit > 0 ? e.credit.toLocaleString("fr-FR") : ""}</TableCell>
              </TableRow>
            ))}
            {ecritures.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune écriture. Les paiements et dépenses apparaîtront ici automatiquement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
