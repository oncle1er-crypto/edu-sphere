import { Receipt, Loader2, Download, Eye } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fcfa } from "../useFinanceData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { generateRecuPDF } from "@/lib/generateDocumentsPDF";

interface PaiementRecu {
  id: string;
  reference: string | null;
  eleve_nom: string;
  eleve_prenom: string;
  matricule: string;
  classe: string;
  montant: number;
  date_paiement: string;
  mode: string;
}

interface EcoleInfo {
  nom: string;
  devise: string;
  adresse: string;
  telephone: string;
}

export default function Receipts() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [recus, setRecus] = useState<PaiementRecu[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecole, setEcole] = useState<EcoleInfo>({
    nom: "Groupe Scolaire La Providence",
    devise: "Foi, Savoir, Excellence",
    adresse: "Abidjan, Côte d'Ivoire",
    telephone: "+225 00 00 00 00",
  });
  const [previewRecu, setPreviewRecu] = useState<PaiementRecu | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Load school info
  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("ecoles")
      .select("nom, devise, adresse, telephone")
      .eq("id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEcole({
            nom: data.nom || "Groupe Scolaire La Providence",
            devise: data.devise || "Foi, Savoir, Excellence",
            adresse: data.adresse || "Abidjan, Côte d'Ivoire",
            telephone: data.telephone || "+225 00 00 00 00",
          });
        }
      });
  }, [ecoleId]);

  // Load payments with student details
  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    supabase
      .from("paiements")
      .select("id, reference, montant, date_paiement, mode, eleves(nom, prenom, matricule, classe_id, classes(nom))")
      .eq("ecole_id", ecoleId)
      .order("date_paiement", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setRecus(data.map((p: any) => ({
            id: p.id,
            reference: p.reference,
            eleve_nom: p.eleves?.nom ?? "—",
            eleve_prenom: p.eleves?.prenom ?? "",
            matricule: p.eleves?.matricule ?? "",
            classe: p.eleves?.classes?.nom ?? "",
            montant: Number(p.montant),
            date_paiement: p.date_paiement,
            mode: p.mode,
          })));
        }
        setLoading(false);
      });
  }, [ecoleId]);

  const buildPDF = (r: PaiementRecu) => generateRecuPDF({
    ecole,
    reference: r.reference ?? r.id.slice(0, 8).toUpperCase(),
    eleve: { nom: r.eleve_nom, prenom: r.eleve_prenom, matricule: r.matricule, classe: r.classe },
    montant: r.montant,
    mode: r.mode,
    date_paiement: r.date_paiement,
  });

  const handleDownload = (r: PaiementRecu) => {
    const pdf = buildPDF(r);
    pdf.save(`recu-${r.reference ?? r.id.slice(0, 8)}.pdf`);
  };

  const handlePreview = (r: PaiementRecu) => {
    setPreviewRecu(r);
    const pdf = buildPDF(r);
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPreviewRecu(null);
  };

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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recus.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reference ?? r.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="font-medium">{r.eleve_prenom} {r.eleve_nom}</TableCell>
                <TableCell className="text-right font-semibold">{fcfa(r.montant)} FCFA</TableCell>
                <TableCell className="text-muted-foreground capitalize">{r.mode.replace("_", " ")}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(r.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Prévisualiser" onClick={() => handlePreview(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Télécharger le reçu PDF" onClick={() => handleDownload(r)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>))}
            {recus.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun paiement enregistré.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewRecu} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reçu — {previewRecu?.eleve_prenom} {previewRecu?.eleve_nom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl && (
              <iframe src={pdfUrl} className="w-full h-full rounded border" title="Aperçu du reçu PDF" />
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => previewRecu && handleDownload(previewRecu)} className="gap-2">
              <Download className="h-4 w-4" /> Télécharger PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
