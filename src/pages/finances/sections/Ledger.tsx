import { FileSpreadsheet, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

interface EcritureComptable {
  date: string;
  account: string;
  label: string;
  debit: number;
  credit: number;
}

// Mapping mode de paiement → compte trésorerie OHADA
// 571 = Caisse (espèces), 521 = Banque (tout le reste : virements, chèques, mobile money agrégé sur compte bancaire).
function compteTresorerie(mode: string): string {
  return mode === "especes" ? "571 - Caisse" : "521 - Banque";
}

// Mapping catégorie de dépense → compte de charge OHADA
function compteCharge(categorie: string | null | undefined): string {
  const c = (categorie ?? "").toLowerCase();
  if (c.includes("nergie") || c.includes("électr") || c.includes("eau")) return "606 - Achats non stockés (énergie, eau)";
  if (c.includes("alaire") || c.includes("paie") || c.includes("personnel")) return "641 - Rémunérations du personnel";
  if (c.includes("loyer")) return "622 - Locations";
  if (c.includes("transport")) return "624 - Transports";
  if (c.includes("entretien") || c.includes("maintenance")) return "624 - Entretien et réparations";
  return "601 - Achats";
}

export default function Ledger() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId || periodLoading || !activeAnnee?.id) { if (!ecoleId && !ecoleLoading) setLoading(false); return; }
    setLoading(true);

    const from = activeAnnee.debut;
    const to = `${activeAnnee.fin}T23:59:59`;

    Promise.all([
      // Encaissements de scolarité (filtrés par année via inner join)
      supabase
        .from("paiements")
        .select("montant, date_paiement, mode, reference, eleves(nom, prenom), tranches!inner(frais_scolarite!inner(annee_id))")
        .eq("ecole_id", ecoleId)
        .eq("tranches.frais_scolarite.annee_id", activeAnnee.id)
        .order("date_paiement", { ascending: false })
        .limit(50),
      // Règlements de dépenses validées sur la période
      supabase
        .from("depenses")
        .select("montant, date_depense, libelle, categorie")
        .eq("ecole_id", ecoleId)
        .eq("statut", "validee")
        .gte("date_depense", from)
        .lte("date_depense", to)
        .order("date_depense", { ascending: false })
        .limit(50),
      // Émissions de factures sur la période
      supabase
        .from("factures")
        .select("montant, date_emission, numero, eleves(nom, prenom)")
        .eq("ecole_id", ecoleId)
        .gte("date_emission", from)
        .lte("date_emission", to)
        .order("date_emission", { ascending: false })
        .limit(50),
    ]).then(([pRes, dRes, fRes]) => {
      const entries: EcritureComptable[] = [];

      // ── Émission de facture : DÉBIT 411 Clients / CRÉDIT 706 Prestations
      (fRes.data ?? []).forEach((f: any) => {
        const nom = f.eleves ? `${f.eleves.nom} ${f.eleves.prenom}` : "Client";
        const ref = f.numero ? ` — facture ${f.numero}` : "";
        entries.push({ date: f.date_emission, account: "411 - Clients", label: `${nom}${ref}`, debit: Number(f.montant), credit: 0 });
        entries.push({ date: f.date_emission, account: "706 - Prestations de services", label: `Scolarité${ref}`, debit: 0, credit: Number(f.montant) });
      });

      // ── Encaissement paiement : DÉBIT 571/521 / CRÉDIT 411 Clients
      (pRes.data ?? []).forEach((p: any) => {
        const nom = p.eleves ? `${p.eleves.nom} ${p.eleves.prenom}` : "Scolarité";
        const ref = p.reference ? ` (réf. ${p.reference})` : "";
        entries.push({ date: p.date_paiement, account: compteTresorerie(p.mode), label: `Encaissement ${nom}${ref}`, debit: Number(p.montant), credit: 0 });
        entries.push({ date: p.date_paiement, account: "411 - Clients", label: nom, debit: 0, credit: Number(p.montant) });
      });

      // ── Règlement dépense : DÉBIT 401 Fournisseurs / CRÉDIT 521 Banque
      // (Le mode de règlement n'est pas stocké côté dépense — on suppose banque par défaut.)
      (dRes.data ?? []).forEach((d: any) => {
        // NB : pour une comptabilité complète, il faudrait aussi enregistrer la réception de facture
        //     (DÉBIT 6xx / CRÉDIT 401). On l'ajoute ici en même temps pour l'équilibre des comptes.
        entries.push({ date: d.date_depense, account: compteCharge(d.categorie), label: d.libelle, debit: Number(d.montant), credit: 0 });
        entries.push({ date: d.date_depense, account: "401 - Fournisseurs", label: d.libelle, debit: 0, credit: Number(d.montant) });
        entries.push({ date: d.date_depense, account: "401 - Fournisseurs", label: `Règlement — ${d.libelle}`, debit: Number(d.montant), credit: 0 });
        entries.push({ date: d.date_depense, account: "521 - Banque", label: `Règlement — ${d.libelle}`, debit: 0, credit: Number(d.montant) });
      });

      entries.sort((a, b) => b.date.localeCompare(a.date));
      setEcritures(entries.slice(0, 100));
      setLoading(false);
    });
  }, [ecoleId, ecoleLoading, periodLoading, activeAnnee?.id, activeAnnee?.debut, activeAnnee?.fin]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Grand livre comptable (${ecritures.length} écritures)`} description="Écritures comptables générées automatiquement (plan OHADA) : émission de factures, encaissements, réception & règlement de dépenses." icon={<FileSpreadsheet className="h-5 w-5" />} hideSave>
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
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune écriture. Les paiements, dépenses et factures apparaîtront ici automatiquement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
