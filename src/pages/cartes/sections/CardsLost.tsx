import { useCards, type CardStatut } from "@/pages/cartes/context/CardsContext";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Ban, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

function badge(s: CardStatut) {
  if (s === "perdue") return <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/15">Perdue</Badge>;
  if (s === "revoquee") return <Badge className="bg-rose-700/20 text-rose-800 hover:bg-rose-700/20">Révoquée</Badge>;
  if (s === "expiree") return <Badge variant="secondary">Expirée</Badge>;
  return <Badge>Active</Badge>;
}

export default function CardsLost() {
  const { cards, setStatut } = useCards();
  const concernees = cards.filter((c) => c.statut !== "active");
  const actives = cards.filter((c) => c.statut === "active");

  return (
    <div className="space-y-6">
      <Card className="border-rose-500/30 bg-rose-500/5 shadow-[var(--shadow-card)]">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-rose-500/15 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-rose-800">Cartes hors service</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cartes perdues, révoquées ou expirées. Le QR code associé n'est plus valide pour les scans.
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Déclarer une carte perdue / révoquée
        </h3>
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Titulaire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actives.slice(0, 8).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom} {c.prenom}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{c.matricule}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmButton
                      size="sm" variant="outline" tone="danger"
                      confirmTitle={`Déclarer la carte de ${c.prenom} ${c.nom} perdue ?`}
                      confirmDescription="Le QR code de cette carte sera invalidé immédiatement et les scans seront refusés. Une nouvelle carte devra être réémise pour le titulaire."
                      confirmLabel="Déclarer perdue"
                      onConfirm={() => { setStatut(c.id, "perdue"); toast.success("Carte marquée perdue"); }}
                    >
                      <Ban className="h-3.5 w-3.5" />Perdue
                    </ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Historique ({concernees.length})
        </h3>
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Titulaire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concernees.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom} {c.prenom}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{c.matricule}</TableCell>
                  <TableCell>{badge(c.statut)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => { setStatut(c.id, "active"); toast.success("Carte réactivée"); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />Réactiver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {concernees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Aucune carte hors service
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
