import { FileSpreadsheet, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { plageFinanciereAnnee } from "@/lib/academicRange";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";

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

// Mapping catégorie de dépense → compte de charge OHADA.
// Table exacte (clé = libellé de EXPENSE_CATEGORIES) plutôt qu'un matching par
// sous-chaîne : un simple renommage de catégorie dans expenseCategories.ts ne
// casse plus silencieusement le mapping comptable (chaque catégorie non
// répertoriée retombe explicitement sur le compte générique 601 - Achats).
const COMPTE_CHARGE_PAR_CATEGORIE: Record<string, string> = {
  "Facture d'électricité": "606 - Achats non stockés (énergie, eau)",
  "Facture d'eau": "606 - Achats non stockés (énergie, eau)",
  "Internet wifi": "626 - Frais postaux et de télécommunications",
  "Service courrier/expédition": "626 - Frais postaux et de télécommunications",
  "Salaires et charges du personnel": "641 - Rémunérations du personnel",
  "CNPS": "645 - Charges de sécurité sociale",
  "Carburant": "624 - Transports",
  "Entretien de véhicules (voiture, moto)": "624 - Transports",
  "Hygiène des locaux (nettoyage, jardinage)": "622 - Entretien et réparations",
  "Travaux d'entretien des locaux": "622 - Entretien et réparations",
  "Entretien/maintenance des appareils": "622 - Entretien et réparations",
  "Assurances": "616 - Primes d'assurances",
  "Fournitures de bureau (registre, cartouche d'encre, stylo…)": "6064 - Fournitures administratives",
  "Fournitures pédagogiques (livres, cahiers, équipements de laboratoire…)": "6064 - Fournitures administratives",
  "Achats d'équipements (ordinateurs, imprimantes, tableaux)": "2183 - Matériel informatique (immobilisation)",
  "Acquisition de nouveaux matériels": "2183 - Matériel et outillage (immobilisation)",
  "Projet - Nouvelles constructions": "231 - Bâtiments en cours (immobilisation)",
  "Communication (affiche, publicité)": "623 - Publicité, publications, relations publiques",
  "Activités scolaires (sorties pédagogiques, compétitions…)": "618 - Divers — activités pédagogiques",
  "Contribution à la caisse commune provinciale": "658 - Charges diverses de gestion courante",
  "Remboursement de prêts": "162 - Emprunts et dettes assimilées",
  "Autres charges": "658 - Charges diverses de gestion courante",
};
// Sécurité de développement : alerte si une catégorie de EXPENSE_CATEGORIES
// n'a pas (ou plus) d'entrée dans le mapping ci-dessus, pour éviter que ça
// retombe silencieusement sur 601 sans que personne ne le remarque.
if (import.meta.env.DEV) {
  const manquantes = EXPENSE_CATEGORIES.filter((c) => !(c in COMPTE_CHARGE_PAR_CATEGORIE));
  if (manquantes.length > 0) {
    console.warn("[Ledger] Catégories de dépense sans compte OHADA mappé (retombent sur 601) :", manquantes);
  }
}

function compteCharge(categorie: string | null | undefined): string {
  if (!categorie) return "601 - Achats";
  return COMPTE_CHARGE_PAR_CATEGORIE[categorie] ?? "601 - Achats";
}

const PAGE_SIZE = 100;
// Plafond de sécurité par source, largement au-dessus des volumes réalistes
// d'une année scolaire — évite une requête réellement non bornée tout en
// garantissant qu'aucune écriture n'est tronquée pour un usage normal.
const FETCH_CAP = 3000;

export default function Ledger() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [tronque, setTronque] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!ecoleId || periodLoading || !activeAnnee?.id) { if (!ecoleId && !ecoleLoading) setLoading(false); return; }
    setLoading(true);
    setVisibleCount(PAGE_SIZE);

    // Dépenses et factures : même fenêtre d'anticipation de rentrée que le
    // reste du module Finances (useBilanComptable, Dépenses, Rapports,
    // Tableau de bord) — sans elle, les dépenses de juillet/août (préparatifs
    // de rentrée) disparaissaient du grand livre alors qu'elles existent bien.
    const plage = plageFinanciereAnnee(activeAnnee);
    const from = plage?.from ?? activeAnnee.debut;
    const to = `${plage?.to ?? activeAnnee.fin}T23:59:59`;

    Promise.all([
      // Encaissements de scolarité (filtrés par année via inner join)
      supabase
        .from("paiements")
        .select("montant, date_paiement, mode, reference, eleves(nom, prenom), tranches!inner(frais_scolarite!inner(annee_id))")
        .eq("ecole_id", ecoleId)
        .eq("tranches.frais_scolarite.annee_id", activeAnnee.id)
        .order("date_paiement", { ascending: false })
        .limit(FETCH_CAP),
      // Règlements de dépenses validées sur la période
      supabase
        .from("depenses")
        .select("montant, date_depense, libelle, categorie")
        .eq("ecole_id", ecoleId)
        .eq("statut", "validee")
        .gte("date_depense", from)
        .lte("date_depense", to)
        .order("date_depense", { ascending: false })
        .limit(FETCH_CAP),
      // Émissions de factures sur la période
      supabase
        .from("factures")
        .select("montant, date_emission, numero, eleves(nom, prenom)")
        .eq("ecole_id", ecoleId)
        .gte("date_emission", from)
        .lte("date_emission", to)
        .order("date_emission", { ascending: false })
        .limit(FETCH_CAP),
    ]).then(([pRes, dRes, fRes]) => {
      // Signale (au lieu de tronquer en silence) si un plafond de sécurité a été atteint.
      setTronque(
        (pRes.data?.length ?? 0) >= FETCH_CAP ||
        (dRes.data?.length ?? 0) >= FETCH_CAP ||
        (fRes.data?.length ?? 0) >= FETCH_CAP,
      );
      const entries: EcritureComptable[] = [];

      // ── Émission de facture : DÉBIT 411 Clients / CRÉDIT 706 Prestations
      (fRes.data ?? []).forEach((f) => {
        const nom = f.eleves ? `${f.eleves.nom} ${f.eleves.prenom}` : "Client";
        const ref = f.numero ? ` — facture ${f.numero}` : "";
        entries.push({ date: f.date_emission, account: "411 - Clients", label: `${nom}${ref}`, debit: Number(f.montant), credit: 0 });
        entries.push({ date: f.date_emission, account: "706 - Prestations de services", label: `Scolarité${ref}`, debit: 0, credit: Number(f.montant) });
      });

      // ── Encaissement paiement : DÉBIT 571/521 / CRÉDIT 411 Clients
      (pRes.data ?? []).forEach((p) => {
        const nom = p.eleves ? `${p.eleves.nom} ${p.eleves.prenom}` : "Scolarité";
        const ref = p.reference ? ` (réf. ${p.reference})` : "";
        entries.push({ date: p.date_paiement, account: compteTresorerie(p.mode), label: `Encaissement ${nom}${ref}`, debit: Number(p.montant), credit: 0 });
        entries.push({ date: p.date_paiement, account: "411 - Clients", label: nom, debit: 0, credit: Number(p.montant) });
      });

      // ── Règlement dépense : DÉBIT 401 Fournisseurs / CRÉDIT 521 Banque
      // (Le mode de règlement n'est pas stocké côté dépense — on suppose banque par défaut.)
      (dRes.data ?? []).forEach((d) => {
        // NB : pour une comptabilité complète, il faudrait aussi enregistrer la réception de facture
        //     (DÉBIT 6xx / CRÉDIT 401). On l'ajoute ici en même temps pour l'équilibre des comptes.
        entries.push({ date: d.date_depense, account: compteCharge(d.categorie), label: d.libelle, debit: Number(d.montant), credit: 0 });
        entries.push({ date: d.date_depense, account: "401 - Fournisseurs", label: d.libelle, debit: 0, credit: Number(d.montant) });
        entries.push({ date: d.date_depense, account: "401 - Fournisseurs", label: `Règlement — ${d.libelle}`, debit: Number(d.montant), credit: 0 });
        entries.push({ date: d.date_depense, account: "521 - Banque", label: `Règlement — ${d.libelle}`, debit: 0, credit: Number(d.montant) });
      });

      entries.sort((a, b) => b.date.localeCompare(a.date));
      setEcritures(entries);
      setLoading(false);
    });
  }, [ecoleId, ecoleLoading, periodLoading, activeAnnee?.id, activeAnnee?.debut, activeAnnee?.fin]);

  const visibles = useMemo(() => ecritures.slice(0, visibleCount), [ecritures, visibleCount]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Grand livre comptable (${ecritures.length} écritures)`} description="Écritures comptables générées automatiquement (plan OHADA) : émission de factures, encaissements, réception & règlement de dépenses." icon={<FileSpreadsheet className="h-5 w-5" />} hideSave>
      {tronque && (
        <p className="mb-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-700">
          Le nombre d'écritures d'une source a atteint le plafond de sécurité ({FETCH_CAP}) : ce grand livre pourrait être incomplet pour la période affichée. Contactez le support si ce cas se présente.
        </p>
      )}
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
            {visibles.map((e, i) => (
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
      {visibleCount < ecritures.length && (
        <div className="flex justify-center mt-3">
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Afficher plus ({ecritures.length - visibleCount} restantes)
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
