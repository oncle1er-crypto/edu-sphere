import { Receipt, Loader2, Download } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useFinanceData, fcfa } from "../useFinanceData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { generateRecuPDF } from "@/lib/generateDocumentsPDF";

interface PaiementRecu {
  id: string;
  reference: string | null;
  eleve_nom: string;
  montant: number;
  date_paiement: string;
  mode: string;
}

export default function Receipts() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [recus, setRecus] = useState<PaiementRecu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    supabase
      .from("paiements")
      .select("id, reference, montant, date_paiement, mode, eleves(nom, prenom)")
      .eq("ecole_id", ecoleId)
      .order("date_paiement", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setRecus(data.map((p: any) => ({
            id: p.id,
            reference: p.reference,
            eleve_nom: p.eleves ? `${p.eleves.prenom} ${p.eleves.nom}` : "—",
            montant: Number(p.montant),
            date_paiement: p.date_paiement,
            mode: p.mode,
          })));
        }
        setLoading(false);
      });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Reçus & quittances (${recus.length})`} description="Documents générés après chaque paiement enregistré." icon={<Receipt className="h-5 w-5" />} hideSave>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Référence</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recus.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reference ?? r.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="font-medium">{r.eleve_nom}</TableCell>
                <TableCell className="text-right font-semibold">{fcfa(r.montant)} FCFA</TableCell>
                <TableCell className="text-muted-foreground capitalize">{r.mode.replace("_", " ")}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(r.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
            {recus.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun paiement enregistré.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
