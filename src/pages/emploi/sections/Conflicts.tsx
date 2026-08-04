import { useEffect, useState, useCallback, useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface Conflict {
  type: string;
  severity: string;
  jour: number | null;
  heure_debut: string | null;
  heure_fin: string | null;
  description: string;
  creneau_ids: string[];
}

const TYPE_LABEL: Record<string, string> = {
  enseignant: "Enseignant",
  classe: "Classe",
  salle: "Salle",
  indisponibilite: "Indisponibilité",
  volume: "Volume horaire",
};

export default function Conflicts() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const scan = useCallback(async () => {
    if (!ecoleId || !anneeId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("detect_all_conflicts" as any, {
      _ecole_id: ecoleId,
      _annee_id: anneeId,
    });
    if (error) {
      toast.error("Erreur scan : " + messageErreurBase(error));
      console.error(error);
    } else {
      setConflicts((data as any[]) ?? []);
    }
    setLastRun(new Date());
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => { scan(); }, [scan]);

  const stats = useMemo(() => {
    const s = { critique: 0, avertissement: 0 };
    conflicts.forEach((c) => {
      if (c.severity === "critique") s.critique++;
      else s.avertissement++;
    });
    return s;
  }, [conflicts]);

  return (
    <SettingsSection
      title="Conflits & alertes"
      description="Analyse serveur des chevauchements, indisponibilités et volumes horaires."
      icon={<AlertTriangle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{stats.critique} critiques</Badge>
          <Badge variant="secondary">{stats.avertissement} avertissements</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={scan} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Relancer l'analyse
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : conflicts.length === 0 ? (
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30 text-sm">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Aucun conflit détecté.
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((c, i) => {
            const slot = c.jour
              ? `${JOURS[c.jour]} ${(c.heure_debut ?? "").slice(0, 5)}-${(c.heure_fin ?? "").slice(0, 5)}`
              : null;
            const critical = c.severity === "critique";
            return (
              <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${critical ? "text-destructive" : "text-primary"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{TYPE_LABEL[c.type] ?? c.type}</span>
                    <Badge variant={critical ? "destructive" : "secondary"}>
                      {critical ? "Critique" : "Avertissement"}
                    </Badge>
                    {slot && <span className="text-xs text-muted-foreground">{slot}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastRun && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Dernière vérification : {lastRun.toLocaleTimeString("fr-FR")}</span>
        </div>
      )}
    </SettingsSection>
  );
}
