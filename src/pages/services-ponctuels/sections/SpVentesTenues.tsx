import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, XCircle, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useSpVentes } from "../hooks/useSpVentes";
import { useSpStockTenues } from "../hooks/useSpStockTenues";
import { VenteTenueDialog } from "../components/VenteTenueDialog";
import { generateSpReceipt } from "../lib/generateSpReceipt";
import { useEcoleInfo } from "../hooks/useEcoleInfo";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";

const STATUT_COLOR: Record<string, string> = {
  paye: "bg-emerald-600", remis: "bg-blue-600", attente: "bg-orange-500", reservation: "bg-amber-500", annule: "bg-destructive",
};

export default function SpVentesTenues() {
  const { ventes, loading, annuler, save } = useSpVentes();
  const { findFor } = useSpStockTenues();
  const ecole = useEcoleInfo();
  const { anneeId } = useAnneeId();
  const { classes } = useClasses(anneeId ?? undefined);
  const classesMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.nom])), [classes]);
  const [open, setOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusHandled = useRef(false);
  useEffect(() => {
    const id = searchParams.get("vente");
    if (!id || loading || focusHandled.current) return;
    if (!ventes.some((v) => v.id === id)) return;
    focusHandled.current = true;
    setFocusId(id);
    const next = new URLSearchParams(searchParams);
    next.delete("vente");
    setSearchParams(next, { replace: true });
    setTimeout(() => {
      document.getElementById(`vente-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [searchParams, ventes, loading]);

  const validerRetrait = async (v: (typeof ventes)[0]) => {
    if (!v.classe_id || !v.genre) return;
    const stock = findFor(v.classe_id, v.genre as "F" | "G");
    const dispo = stock?.stock_actuel ?? 0;
    if (dispo < v.quantite) {
      return toast.error(`Stock encore insuffisant : ${dispo} tenue(s) disponible(s), ${v.quantite} demandée(s).`);
    }
    await save({ id: v.id, statut: "remis" } as any);
  };



  const reprint = async (v: (typeof ventes)[0]) => {
    const e = ecole ?? {} as any;
    const titre =
      v.statut === "annule" ? "REÇU DE CORRECTION" :
      v.statut === "reservation" ? "REÇU — PAYÉ & RÉSERVÉ" :
      v.statut === "attente" ? "REÇU — EN ATTENTE DE PAIEMENT" :
      (v.statut === "paye" || v.statut === "remis") ? "REÇU — PAYÉ & RETIRÉ" :
      "REÇU DE VENTE";
    const mention =
      v.statut === "reservation"
        ? "Tenue réservée — à retirer dès réapprovisionnement du stock."
        : (v.statut === "paye" || v.statut === "remis")
        ? "Tenue payée et retirée par l'acheteur."
        : v.statut === "attente"
        ? "Vente enregistrée, paiement en attente."
        : v.statut === "annule"
        ? "Opération annulée."
        : "";
    const obs = [v.observations, mention].filter(Boolean).join(" — ");
    await generateSpReceipt({
      numero: v.numero,
      date: new Date(v.created_at).toLocaleString("fr-FR"),
      ecoleNom: e.nom ?? "",
      ecoleSigle: e.sigle,
      ecoleAdresse: e.adresse,
      ecoleTelephone: e.telephone,
      ecoleEmail: e.email,
      logoUrl: e.logo_url,
      service: "Tenue scolaire",
      beneficiaire: v.acheteur_libre ?? "—",
      quantite: v.quantite,
      montantDu: v.montant_total,
      montantPaye: v.statut === "annule" || v.statut === "attente" ? 0 : v.montant_total,
      modePaiement: v.mode_paiement,
      titre,
      observations: obs || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vente de tenues</CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nouvelle vente</Button>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Acheteur</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventes.map((v) => (
                  <TableRow key={v.id} id={`vente-${v.id}`} className={focusId === v.id ? "bg-accent/20 ring-2 ring-accent" : undefined}>
                    <TableCell className="font-mono text-xs">{v.numero}</TableCell>
                    <TableCell>{new Date(v.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{v.acheteur_libre ?? "—"}</TableCell>
                    <TableCell>{v.classe_id ? (classesMap[v.classe_id] ?? "—") : "—"}</TableCell>
                    <TableCell>{v.genre === "F" ? "Fille" : v.genre === "G" ? "Garçon" : "—"}</TableCell>
                    <TableCell>{v.quantite}</TableCell>
                    <TableCell className="font-medium">{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</TableCell>
                    <TableCell>{v.mode_paiement}</TableCell>
                    <TableCell><Badge className={STATUT_COLOR[v.statut]}>{v.statut}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {v.statut === "reservation" && (
                          <Button size="sm" variant="default" className="h-8" onClick={() => validerRetrait(v)} title="Valider le retrait">
                            <PackageCheck className="h-4 w-4 mr-1" /> Retrait
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => reprint(v)} title="Reçu"><Printer className="h-4 w-4" /></Button>
                        {v.statut !== "annule" && (
                          <Button size="icon" variant="ghost" onClick={async () => {
                            const m = prompt("Motif d'annulation ?"); if (m && m.length >= 3) await annuler(v.id, m);
                          }} title="Annuler"><XCircle className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VenteTenueDialog open={open} onOpenChange={setOpen} onSuccess={reprint} />
    </div>
  );
}
