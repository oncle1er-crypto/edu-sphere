import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wrench, RefreshCw, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

interface Props {
  eleveId: string;
  ecoleId: string;
  onChanged?: () => void;
}

interface FraisRow {
  id: string;
  libelle: string;
  montant_annuel: number;
  nb_tranches: number;
  cycle_id: string;
  cycles?: { nom: string } | null;
}

/** Devine la variante Ancien/Nouveau à partir du libellé de la grille. */
function variantHint(libelle: string): "Nouveau" | "Ancien" | null {
  const l = libelle.toLowerCase();
  if (l.includes("nouveau")) return "Nouveau";
  if (l.includes("ancien")) return "Ancien";
  return null;
}

function fmt(n: number) {
  return Number(n).toLocaleString("fr-FR");
}

export function CustomFeeOverride({ eleveId, ecoleId, onChanged }: Props) {
  const { activeAnnee } = useAcademicPeriod();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [options, setOptions] = useState<FraisRow[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>("");
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [forceRecalc, setForceRecalc] = useState<boolean>(true);

  const load = async () => {
    setLoading(true);
    const [{ data: opts }, { data: el }, { data: trs }] = await Promise.all([
      supabase
        .from("frais_scolarite")
        .select("id, libelle, montant_annuel, nb_tranches, cycle_id, cycles(nom)")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", activeAnnee.id)
        .order("libelle"),
      supabase
        .from("eleves")
        .select("frais_id_override")
        .eq("id", eleveId)
        .maybeSingle(),
      supabase
        .from("tranches")
        .select("montant")
        .eq("eleve_id", eleveId),
    ]);
    setOptions((opts as any[]) ?? []);
    const cur = (el as any)?.frais_id_override ?? null;
    setCurrent(cur);
    setSelection(cur ?? "");
    setCurrentTotal((trs ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0));
    // Par défaut on suppose une correction d'erreur initiale → force recalc
    setForceRecalc(true);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eleveId, ecoleId, activeAnnee.id]);

  const selectedOption = useMemo(() => options.find(o => o.id === selection), [options, selection]);
  const currentLabel = options.find(o => o.id === current);

  const delta = selectedOption ? Number(selectedOption.montant_annuel) - currentTotal : 0;
  const showRecap = selectedOption && selection !== current;

  const applyAndRegen = async (newId: string | null) => {
    setSaving(true);
    const { error } = await supabase
      .from("eleves")
      .update({ frais_id_override: newId } as any)
      .eq("id", eleveId);
    if (error) { setSaving(false); toast.error(error.message); return; }
    setCurrent(newId);
    setRegen(true);
    const { error: rpcErr } = await supabase.rpc(
      "generer_tranches_eleve" as any,
      { _eleve_id: eleveId, _force_recalc: forceRecalc } as any,
    );
    setRegen(false);
    setSaving(false);
    if (rpcErr) { toast.error("Regénération refusée", { description: rpcErr.message }); return; }
    toast.success(newId ? "Grille personnalisée appliquée" : "Grille automatique rétablie", {
      description: forceRecalc
        ? "Toutes les tranches ont été recalées sur la nouvelle grille."
        : "Les tranches non payées ont été recalculées ; les tranches déjà encaissées ont gardé leur montant.",
    });
    onChanged?.();
    // Recharger le total courant pour refléter la nouvelle grille
    const { data: trs } = await supabase.from("tranches").select("montant").eq("eleve_id", eleveId);
    setCurrentTotal((trs ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0));
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Grille tarifaire personnalisée</p>
          {current && <span className="ml-auto text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">Active</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Force une grille de frais différente de celle déduite de la classe. Utile pour rattraper une erreur d'affectation (p.ex. élève <em>nouveau en Grande Section</em> enregistré par erreur avec le tarif Maternelle).
        </p>
        {loading ? (
          <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <>
            <div className="flex gap-2">
              <Select value={selection} onValueChange={setSelection} disabled={saving || regen}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir une grille…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(o => {
                    const v = variantHint(o.libelle);
                    return (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="font-medium">{o.libelle}</span>
                        {v && (
                          <span className={`ml-1 text-[10px] rounded px-1 py-0.5 ${v === "Nouveau" ? "bg-accent/40 text-foreground" : "bg-muted text-muted-foreground"}`}>
                            {v}
                          </span>
                        )}
                        <span className="ml-2 text-muted-foreground">
                          — {fmt(o.montant_annuel)} FCFA · {o.nb_tranches} tr.
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => applyAndRegen(selection || null)}
                disabled={saving || regen || !selection || selection === current}
              >
                {(saving || regen) ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Appliquer
              </Button>
              {current && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => applyAndRegen(null)}
                  disabled={saving || regen}
                  title="Revenir à la grille automatique"
                >
                  <X className="h-3 w-3 mr-1" /> Retirer
                </Button>
              )}
            </div>

            {/* Case : corriger une erreur d'affectation */}
            <label className="flex items-start gap-2 rounded-md bg-muted/40 p-2 cursor-pointer">
              <Checkbox
                checked={forceRecalc}
                onCheckedChange={(v) => setForceRecalc(!!v)}
                disabled={saving || regen}
                className="mt-0.5"
              />
              <div className="text-[11px] leading-snug">
                <span className="font-semibold">Corriger une erreur d'affectation initiale</span>
                <span className="text-muted-foreground"> — recalcule aussi les tranches déjà encaissées.</span>
                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                  À cocher quand l'élève a été créé avec la mauvaise grille. Les paiements existants restent liés à leurs tranches (reçus valides), mais les montants sont recalés. Un trop-perçu apparaît comme reste à payer négatif.
                </p>
              </div>
            </label>

            {/* Bandeau récap */}
            {showRecap && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  Ancien total : <strong>{fmt(currentTotal)} FCFA</strong> → Nouveau total :{" "}
                  <strong>{fmt(selectedOption!.montant_annuel)} FCFA</strong>
                  {delta !== 0 && (
                    <span className={delta > 0 ? "text-destructive font-semibold" : "text-success font-semibold"}>
                      {" "}({delta > 0 ? "+" : ""}{fmt(delta)} FCFA)
                    </span>
                  )}
                  . {selectedOption!.nb_tranches} tranche(s) recalculée(s).
                </div>
              </div>
            )}

            {currentLabel && (
              <p className="text-[10.5px] text-muted-foreground">
                Actuellement : <strong>{currentLabel.libelle}</strong> ({fmt(currentLabel.montant_annuel)} FCFA)
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
