import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, FilePlus2 } from "lucide-react";
import type { ApercuPaie, EtatPersonnel } from "@/hooks/useRhPaie";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  apercu: (mois: number, annee: number) => Promise<ApercuPaie | null>;
  genererBrouillons: (mois: number, annee: number) => Promise<number | null>;
  onDone?: (mois: number, annee: number) => void;
}

function fmt(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

const ETAT_LABEL: Record<EtatPersonnel, string> = {
  pret: "Prêt",
  a_corriger: "À corriger",
  deja_cree: "Déjà créé",
};

const ETAT_CLASS: Record<EtatPersonnel, string> = {
  pret: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  a_corriger: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  deja_cree: "bg-muted text-muted-foreground hover:bg-muted",
};

export default function PreparePaieDialog({
  open,
  onOpenChange,
  apercu,
  genererBrouillons,
  onDone,
}: Props) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [periode, setPeriode] = useState(defaultMonth);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<ApercuPaie | null>(null);

  const parse = () => {
    const [a, m] = periode.split("-");
    return { annee: Number(a), mois: Number(m) };
  };

  const verifier = async () => {
    const { annee, mois } = parse();
    if (!annee || !mois || mois < 1 || mois > 12) return;
    setChecking(true);
    const res = await apercu(mois, annee);
    setData(res);
    setChecking(false);
  };

  const creer = async () => {
    const { annee, mois } = parse();
    setCreating(true);
    const created = await genererBrouillons(mois, annee);
    setCreating(false);
    if (created !== null) {
      onDone?.(mois, annee);
      onOpenChange(false);
      setData(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setData(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Préparer les fiches de paie du mois</DialogTitle>
          <DialogDescription>
            Le calcul produit d'abord un aperçu. Aucun bulletin n'est validé ou payé
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="periode-paie">Mois concerné</Label>
              <Input
                id="periode-paie"
                type="month"
                value={periode}
                onChange={(e) => {
                  setPeriode(e.target.value);
                  setData(null);
                }}
              />
            </div>
            <Button onClick={verifier} disabled={checking} className="shrink-0">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Vérifier les variables du mois
            </Button>
          </div>

          {data && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Prêts</p>
                    <p className="text-lg font-extrabold font-display text-blue-600">
                      {data.prets}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">À corriger</p>
                    <p className="text-lg font-extrabold font-display text-orange-600">
                      {data.a_corriger}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Déjà créés</p>
                    <p className="text-lg font-extrabold font-display text-muted-foreground">
                      {data.deja_crees}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Net estimé</p>
                    <p className="text-sm font-extrabold font-display text-emerald-600">
                      {fmt(data.net_estime)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg divide-y">
                {data.personnels.map((p) => (
                  <div
                    key={p.personnel_id}
                    className="p-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {p.nom} {p.prenom}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.matricule ?? "—"}</p>
                      {(p.alertes ?? []).map((a, i) => (
                        <p key={i} className="text-xs text-orange-600 mt-1">
                          • {a}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={ETAT_CLASS[p.etat]} variant="secondary">
                        {ETAT_LABEL[p.etat]}
                      </Badge>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {fmt(p.net_a_payer)}
                      </span>
                    </div>
                  </div>
                ))}
                {data.personnels.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Aucun membre du personnel à traiter pour ce mois.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={creer} disabled={!data || data.prets === 0 || creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            Créer {data?.prets ?? 0} brouillon(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
