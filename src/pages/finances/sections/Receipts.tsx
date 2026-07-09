import { Receipt, Loader2, Download, Eye } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fcfa } from "../useFinanceData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { generateRecuPDF } from "@/lib/generateDocumentsPDF";

interface PaiementRecu {
  id: string;
  reference: string | null;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  matricule: string;
  classe: string;
  photo_url?: string | null;
  montant: number;
  date_paiement: string;
  mode: string;
}

interface EcoleInfo {
  nom: string;
  sigle?: string;
  devise: string;
  adresse: string;
  telephone: string;
  email?: string;
  logo_url?: string | null;
}

export default function Receipts() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const [recus, setRecus] = useState<PaiementRecu[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecole, setEcole] = useState<EcoleInfo>({
    nom: "Complexe Scolaire La Providence de Don Orione",
    sigle: "CSP",
    devise: "Foi, Savoir, Excellence",
    adresse: "Abidjan, Côte d'Ivoire",
    telephone: "+225 00 00 00 00",
    email: "",
    logo_url: null,
  });
  const [previewRecu, setPreviewRecu] = useState<PaiementRecu | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("ecoles")
      .select("nom, sigle, devise, adresse, telephone, email, logo_url")
      .eq("id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEcole({
            nom: data.nom || "Complexe Scolaire La Providence de Don Orione",
            sigle: data.sigle || "",
            devise: data.devise || "Foi, Savoir, Excellence",
            adresse: data.adresse || "Abidjan, Côte d'Ivoire",
            telephone: data.telephone || "+225 00 00 00 00",
            email: data.email || "",
            logo_url: data.logo_url || null,
          });
        }
      });
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleId || periodLoading || !activeAnnee?.id) { if (!ecoleId && !ecoleLoading) setLoading(false); return; }
    setLoading(true);
    // Récupère les tranches de l'année pour filtrer les paiements
    supabase
      .from("tranches")
      .select("id, frais_scolarite!inner(annee_id)")
      .eq("ecole_id", ecoleId)
      .eq("frais_scolarite.annee_id", activeAnnee.id)
      .then(({ data: trData }) => {
        const trancheIds = (trData ?? []).map((t: any) => t.id);
        if (trancheIds.length === 0) { setRecus([]); setLoading(false); return; }
        supabase
          .from("paiements")
          .select("id, reference, montant, date_paiement, mode, eleve_id, eleves(nom, prenom, matricule, photo_url, classe_id, classes(nom))")
          .eq("ecole_id", ecoleId)
          .in("tranche_id", trancheIds)
          .order("date_paiement", { ascending: false })
          .limit(50)
          .then(({ data }) => {
            if (data) {
              setRecus(data.map((p: any) => ({
                id: p.id,
                reference: p.reference,
                eleve_id: p.eleve_id,
                eleve_nom: p.eleves?.nom ?? "—",
                eleve_prenom: p.eleves?.prenom ?? "",
                matricule: p.eleves?.matricule ?? "",
                classe: p.eleves?.classes?.nom ?? "",
                photo_url: p.eleves?.photo_url ?? null,
                montant: Number(p.montant),
                date_paiement: p.date_paiement,
                mode: p.mode,
              })));
            }
            setLoading(false);
          });
      });
  }, [ecoleId, ecoleLoading, periodLoading, activeAnnee?.id]);

  const buildPDF = async (r: PaiementRecu) => {
    const [{ data: tranches }, { data: paiements }] = await Promise.all([
      supabase.from("tranches").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", r.eleve_id),
      supabase.from("paiements").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", r.eleve_id),
    ]);
    const total_du = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);
    const total_paye = (paiements ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);

    return generateRecuPDF({
      ecole: {
        nom: ecole.nom,
        sigle: ecole.sigle,
        devise: ecole.devise,
        adresse: ecole.adresse,
        telephone: ecole.telephone,
        email: ecole.email,
        logoUrl: ecole.logo_url,
      },
      reference: r.reference ?? r.id.slice(0, 8).toUpperCase(),
      eleve: { nom: r.eleve_nom, prenom: r.eleve_prenom, matricule: r.matricule, classe: r.classe, photo_url: r.photo_url },
      montant: r.montant,
      mode: r.mode,
      date_paiement: r.date_paiement,
      total_du,
      total_paye,
    });
  };

  const handleDownload = async (r: PaiementRecu) => {
    setBusy(true);
    try {
      const pdf = await buildPDF(r);
      pdf.save(`recu-${r.reference ?? r.id.slice(0, 8)}.pdf`);
    } finally { setBusy(false); }
  };

  const handlePreview = async (r: PaiementRecu) => {
    setBusy(true);
    setPreviewRecu(r);
    try {
      const pdf = await buildPDF(r);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } finally { setBusy(false); }
  };

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPreviewRecu(null);
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

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
                <TableCell className="font-medium">{r.eleve_nom} {r.eleve_prenom}</TableCell>
                <TableCell className="text-right font-semibold">{fcfa(r.montant)} FCFA</TableCell>
                <TableCell className="text-muted-foreground capitalize">{r.mode.replace("_", " ")}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(r.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Prévisualiser" onClick={() => handlePreview(r)} disabled={busy}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Télécharger le reçu PDF" onClick={() => handleDownload(r)} disabled={busy}>
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

      <Dialog open={!!previewRecu} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reçu — {previewRecu?.eleve_nom} {previewRecu?.eleve_prenom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full rounded border" title="Aperçu du reçu PDF" />
            ) : (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => previewRecu && handleDownload(previewRecu)} className="gap-2" disabled={busy}>
              <Download className="h-4 w-4" /> Télécharger PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
