import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, XCircle } from "lucide-react";
import { useSpVentes } from "../hooks/useSpVentes";
import { VenteTenueDialog } from "../components/VenteTenueDialog";
import { generateSpReceipt } from "../lib/generateSpReceipt";
import { useEcoleInfo } from "../hooks/useEcoleInfo";
import { useClasses } from "@/hooks/useClasses";

const STATUT_COLOR: Record<string, string> = {
  paye: "bg-emerald-600", remis: "bg-blue-600", attente: "bg-orange-500", annule: "bg-destructive",
};

export default function SpVentesTenues() {
  const { ventes, loading, annuler } = useSpVentes();
  const ecole = useEcoleInfo();
  const { classes } = useClasses();
  const classesMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.nom])), [classes]);
  const [open, setOpen] = useState(false);

  const reprint = async (v: (typeof ventes)[0]) => {
    const e = ecole ?? {} as any;
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
      montantPaye: v.statut === "annule" ? 0 : v.montant_total,
      modePaiement: v.mode_paiement,
      titre: v.statut === "annule" ? "REÇU DE CORRECTION" : "REÇU DE VENTE",
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
                  <TableRow key={v.id}>
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
