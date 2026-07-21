import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSpVentes, type SpModePaiement, type SpVenteStatut, type SpVenteTenue } from "../hooks/useSpVentes";
import { useSpServices } from "../hooks/useSpServices";
import { useSpStockTenues, type SpGenre } from "../hooks/useSpStockTenues";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";

const MODES: SpModePaiement[] = ["especes", "wave", "orange_money", "mtn_money", "moov_money", "virement", "cheque"];
const STATUTS: SpVenteStatut[] = ["paye", "remis", "attente", "annule"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (v: SpVenteTenue) => void;
}

// Détection sexe élève : F/f/Feminin => F ; sinon G
function eleveGenre(sexe?: string | null): SpGenre | null {
  if (!sexe) return null;
  const c = sexe.trim().toUpperCase()[0];
  if (c === "F") return "F";
  if (c === "M" || c === "G" || c === "H") return "G";
  return null;
}

export function VenteTenueDialog({ open, onOpenChange, onSuccess }: Props) {
  const { save } = useSpVentes();
  const { services } = useSpServices();
  const { classes } = useClasses();
  const { eleves } = useEleves();
  const { findFor } = useSpStockTenues();

  const tenueService = services.find((s) => s.slug === "tenue") ?? services.find((s) => s.gere_stock);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classeId, setClasseId] = useState<string>("");
  const [genre, setGenre] = useState<SpGenre | "">("");
  const [eleveId, setEleveId] = useState<string>("");
  const [acheteurLibre, setAcheteurLibre] = useState<string>("");
  const [searchEleve, setSearchEleve] = useState("");
  const [qte, setQte] = useState(1);
  const [prix, setPrix] = useState(0);
  const [mode, setMode] = useState<SpModePaiement>("especes");
  const [statut, setStatut] = useState<SpVenteStatut>("paye");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1); setClasseId(""); setGenre(""); setEleveId(""); setAcheteurLibre("");
      setSearchEleve(""); setQte(1); setPrix(0); setMode("especes"); setStatut("paye"); setObs("");
    }
  }, [open]);

  const stockF = classeId ? findFor(classeId, "F") : null;
  const stockG = classeId ? findFor(classeId, "G") : null;
  const stockCourant = genre ? findFor(classeId, genre) : null;
  const stockDispo = stockCourant?.stock_actuel ?? 0;

  useEffect(() => {
    if (stockCourant?.prix_unitaire) setPrix(Number(stockCourant.prix_unitaire));
    else if (tenueService?.prix) setPrix(Number(tenueService.prix));
  }, [stockCourant, tenueService]);

  const elevesFiltres = useMemo(() => {
    if (!classeId) return [];
    const q = searchEleve.trim().toLowerCase();
    return eleves
      .filter((e: any) => e.classe_id === classeId)
      .filter((e: any) => {
        if (!genre) return true;
        const eg = eleveGenre(e.sexe);
        return !eg || eg === genre;
      })
      .filter((e: any) => !q || `${e.nom} ${e.prenoms} ${e.matricule ?? ""}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [eleves, classeId, genre, searchEleve]);

  const canValidate =
    !!classeId && !!genre && (!!eleveId || !!acheteurLibre.trim()) && qte > 0 && prix > 0;

  const submit = async () => {
    if (!canValidate) return;
    if (stockCourant && qte > stockDispo) {
      const classeNom = classes.find((c) => c.id === classeId)?.nom ?? "";
      return toast.error(`Stock insuffisant : ${stockDispo} tenue(s) disponible(s) pour ${genre === "F" ? "Fille" : "Garçon"} en ${classeNom}`);
    }
    setSaving(true);
    const eleve = eleves.find((e: any) => e.id === eleveId);
    const nomAff = eleve ? `${eleve.nom} ${eleve.prenoms}` : acheteurLibre;
    const v = await save({
      acheteur_type: eleveId ? "eleve" : "libre",
      eleve_id: eleveId || null,
      acheteur_libre: eleveId ? nomAff : (acheteurLibre || null),
      classe_id: classeId,
      genre: genre as SpGenre,
      quantite: qte,
      prix_unitaire: prix,
      montant_total: qte * prix,
      mode_paiement: mode,
      statut,
      observations: obs || null,
    } as any);
    setSaving(false);
    if (v) { onSuccess?.(v); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Vente de tenue — étape {step}/3</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Classe</Label>
              <Select value={classeId} onValueChange={setClasseId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {classeId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Stock Fille</p>
                  <p className="text-2xl font-bold">{stockF?.stock_actuel ?? 0}</p>
                  {(stockF?.stock_actuel ?? 0) === 0 && <Badge className="bg-destructive mt-1">Rupture</Badge>}
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Stock Garçon</p>
                  <p className="text-2xl font-bold">{stockG?.stock_actuel ?? 0}</p>
                  {(stockG?.stock_actuel ?? 0) === 0 && <Badge className="bg-destructive mt-1">Rupture</Badge>}
                </div>
              </div>
            )}
            <div>
              <Label>Genre</Label>
              <Select value={genre} onValueChange={(v) => setGenre(v as SpGenre)}>
                <SelectTrigger><SelectValue placeholder="Fille ou Garçon" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Fille</SelectItem>
                  <SelectItem value="G">Garçon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>Rechercher un élève de la classe</Label>
              <Input placeholder="Nom, prénoms ou matricule…" value={searchEleve} onChange={(e) => setSearchEleve(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-auto rounded-md border divide-y">
              {elevesFiltres.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Aucun élève trouvé.</p>
              ) : elevesFiltres.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setEleveId(e.id); setAcheteurLibre(""); }}
                  className={`w-full text-left px-3 py-2 hover:bg-muted text-sm ${eleveId === e.id ? "bg-muted font-medium" : ""}`}
                >
                  {e.nom} {e.prenoms} <span className="text-xs text-muted-foreground">— {e.matricule ?? "—"}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">— ou —</div>
            <div>
              <Label>Acheteur externe (nom libre)</Label>
              <Input value={acheteurLibre} onChange={(e) => { setAcheteurLibre(e.target.value); setEleveId(""); }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Quantité</Label><Input type="number" min={1} value={qte} onChange={(e) => setQte(+e.target.value)} /></div>
              <div><Label>Prix unitaire</Label><Input type="number" value={prix} onChange={(e) => setPrix(+e.target.value)} /></div>
            </div>
            <p className="text-sm">Total : <strong>{(qte * prix).toLocaleString("fr-FR")} FCFA</strong></p>
            {stockCourant && (
              <p className={`text-xs ${qte > stockDispo ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Stock disponible : {stockDispo} tenue(s){qte > stockDispo ? " — insuffisant !" : ""}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as SpModePaiement)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={statut} onValueChange={(v) => setStatut(v as SpVenteStatut)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observations</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2">
          <Button variant="outline" onClick={() => step === 1 ? onOpenChange(false) : setStep((s) => (s - 1) as any)}>
            {step === 1 ? "Annuler" : "Retour"}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as any)}
              disabled={(step === 1 && (!classeId || !genre)) || (step === 2 && !eleveId && !acheteurLibre.trim())}
            >
              Suivant
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || !canValidate}>Valider la vente</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
