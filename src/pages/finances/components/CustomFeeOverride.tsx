import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wrench, RefreshCw, X } from "lucide-react";
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

export function CustomFeeOverride({ eleveId, ecoleId, onChanged }: Props) {
  const { activeAnnee } = useAcademicPeriod();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [options, setOptions] = useState<FraisRow[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: opts }, { data: el }] = await Promise.all([
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
    ]);
    setOptions((opts as any[]) ?? []);
    const cur = (el as any)?.frais_id_override ?? null;
    setCurrent(cur);
    setSelection(cur ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eleveId, ecoleId, activeAnnee.id]);

  const applyAndRegen = async (newId: string | null) => {
    setSaving(true);
    const { error } = await supabase
      .from("eleves")
      .update({ frais_id_override: newId } as any)
      .eq("id", eleveId);
    if (error) { setSaving(false); toast.error(error.message); return; }
    setCurrent(newId);
    // Régénérer immédiatement l'échéancier
    setRegen(true);
    const { error: rpcErr } = await supabase.rpc("generer_tranches_eleve" as any, { _eleve_id: eleveId });
    setRegen(false);
    setSaving(false);
    if (rpcErr) { toast.error("Regénération refusée", { description: rpcErr.message }); return; }
    toast.success(newId ? "Grille personnalisée appliquée" : "Grille automatique rétablie", {
      description: "Les tranches non payées ont été recalculées.",
    });
    onChanged?.();
  };

  const currentLabel = options.find(o => o.id === current);

  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Grille tarifaire personnalisée</p>
          {current && <span className="ml-auto text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">Active</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Force une grille de frais différente de celle déduite de la classe. Utile pour appliquer p.ex. le tarif <em>Grande Section (Nouveau)</em> à un élève resté en Maternelle 1.
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
                  {options.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.libelle} — {Number(o.montant_annuel).toLocaleString("fr-FR")} FCFA ({o.nb_tranches} tr.)
                    </SelectItem>
                  ))}
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
            {currentLabel && (
              <p className="text-[10.5px] text-muted-foreground">
                Actuellement : <strong>{currentLabel.libelle}</strong> ({Number(currentLabel.montant_annuel).toLocaleString("fr-FR")} FCFA)
              </p>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              Les tranches déjà encaissées sont conservées ; seules celles non payées sont recréées au nouveau tarif.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
