import { useState } from "react";
import {
  Wand2,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBudget, type LigneBudget } from "@/hooks/useBudget";
import { toast } from "sonner";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const signed = (n: number) =>
  `${n >= 0 ? "+" : "−"} ${Math.abs(Math.round(n)).toLocaleString("fr-FR")} FCFA`;

export default function Budget() {
  const [selectedAnnee, setSelectedAnnee] = useState<string | null>(null);
  const {
    recettes,
    depenses,
    lignes,
    annees,
    anneeId,
    anneeActiveId,
    loading,
    addLigne,
    updateLigne,
    genererBudget,
    recettesPrevues,
    recettesReelles,
    depensesPrevues,
    depensesReelles,
    soldePrevisionnel,
    soldeReel,
  } = useBudget(selectedAnnee);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ libelle: "", type: "depense", montant_prevu: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [generating, setGenerating] = useState(false);

  const translateError = (msg: string) => {
    if (msg.includes("not_authorized")) return "Réservé aux administrateurs, directeurs et comptables";
    if (msg.includes("not_authenticated")) return "Session expirée, reconnectez-vous";
    return msg;
  };

  const runGeneration = async (remplacer: boolean) => {
    setGenerating(true);
    try {
      const res = await genererBudget(remplacer);
      toast.success(
        `Budget généré : ${res.lignes ?? 0} lignes · effectif pris en compte : ${res.effectif ?? 0} élèves`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      const match = msg.match(/budget_deja_genere:(\d+)/);
      if (match) {
        setExistingCount(Number(match[1]));
        setConfirmOpen(true);
      } else {
        toast.error(translateError(msg));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.libelle || !form.montant_prevu) return;
    await addLigne({
      libelle: form.libelle,
      type: form.type,
      montant_prevu: Number(form.montant_prevu),
    });
    setForm({ libelle: "", type: "depense", montant_prevu: "" });
    setShowForm(false);
  };

  const summaryCards = [
    { label: "Recettes prévisionnelles", value: recettesPrevues, up: true },
    { label: "Recettes réelles", value: recettesReelles, up: true },
    { label: "Dépenses prévisionnelles", value: depensesPrevues, up: false },
    { label: "Dépenses réelles", value: depensesReelles, up: false },
  ];

  const renderLigne = (b: LigneBudget) => {
    const pct = b.montant_prevu > 0 ? Math.round((b.montant_realise / b.montant_prevu) * 100) : 0;
    const auto = b.source !== null;
    return (
      <div key={b.id} className="rounded-lg border p-4 space-y-2 bg-card">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold truncate">{b.libelle}</p>
            {auto && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                auto
              </Badge>
            )}
          </div>
          <span className="text-xs font-bold text-primary shrink-0">{pct}%</span>
        </div>
        <Progress value={Math.min(pct, 100)} className="h-2" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {Math.round(b.montant_realise).toLocaleString("fr-FR")} /{" "}
            {Math.round(b.montant_prevu).toLocaleString("fr-FR")} FCFA
          </p>
          {!auto && (
            <Input
              type="number"
              defaultValue={b.montant_prevu}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v !== b.montant_prevu) updateLigne(b.id, { montant_prevu: v });
              }}
              className="h-8 w-32 text-xs"
              aria-label={`Montant prévisionnel ${b.libelle}`}
            />
          )}
        </div>
      </div>
    );
  };

  const renderColonne = (title: string, items: LigneBudget[], color: string) => (
    <div className="space-y-3">
      <h3 className={`text-sm font-bold uppercase tracking-wider ${color}`}>
        {title} ({items.length} {items.length > 1 ? "lignes" : "ligne"})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
          Aucune ligne budgétaire
        </p>
      ) : (
        <div className="space-y-3">{items.map(renderLigne)}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Finance
          </p>
          <h1 className="text-2xl font-bold font-display text-primary">Budget Prévisionnel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suivi prévisionnel vs réel par année scolaire
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={anneeId ?? undefined}
            onValueChange={(v) => setSelectedAnnee(v)}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Année scolaire" />
            </SelectTrigger>
            <SelectContent>
              {annees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.id === anneeActiveId ? "★ " : ""}
                  {a.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={generating || loading}
            onClick={() => runGeneration(false)}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Générer
          </Button>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            Ajouter ligne
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Cartes de synthèse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((c) => (
              <Card key={c.label} className="border shadow-[var(--shadow-card)]">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold font-display mt-1 break-words">{fmt(c.value)}</p>
                  </div>
                  {c.up ? (
                    <TrendingUp className="h-5 w-5 text-success shrink-0" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-warning shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Soldes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border bg-accent/10">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Solde réel</p>
                <p
                  className={`text-2xl font-bold font-display mt-1 ${
                    soldeReel >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {signed(soldeReel)}
                </p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Solde prévisionnel
                </p>
                <p
                  className={`text-2xl font-bold font-display mt-1 ${
                    soldePrevisionnel >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {signed(soldePrevisionnel)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire en ligne */}
          {showForm && (
            <Card className="border">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold font-display text-primary">
                  Nouvelle ligne budgétaire
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Catégorie</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recette">Recettes</SelectItem>
                        <SelectItem value="depense">Dépenses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Libellé</Label>
                    <Input
                      placeholder="Ex: Frais de scolarité"
                      value={form.libelle}
                      onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Montant prévisionnel (FCFA)</Label>
                    <Input
                      type="number"
                      value={form.montant_prevu}
                      onChange={(e) => setForm({ ...form, montant_prevu: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit}>Ajouter</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {lignes.length === 0 ? (
            <Card className="border border-dashed">
              <CardContent className="p-10 text-center space-y-3">
                <Star className="h-6 w-6 mx-auto text-accent" />
                <p className="text-sm text-muted-foreground">
                  Aucune ligne budgétaire pour cette année. Cliquez sur « Générer » pour créer
                  automatiquement le budget prévisionnel.
                </p>
                <Button size="sm" onClick={() => runGeneration(false)} disabled={generating}>
                  <Wand2 className="h-4 w-4" />
                  Générer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderColonne("Recettes", recettes, "text-success")}
              {renderColonne("Dépenses", depenses, "text-destructive")}
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer le budget ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un budget existe déjà pour cette année ({existingCount} lignes). Régénérer écrasera les
              montants prévisionnels des lignes automatiques. Les lignes saisies manuellement seront
              conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(false);
                runGeneration(true);
              }}
            >
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
