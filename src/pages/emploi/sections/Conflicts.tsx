import { useEffect, useState, useCallback } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { Skeleton } from "@/components/ui/skeleton";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface Conflict {
  type: "Enseignant" | "Salle" | "Classe";
  severity: "Critique" | "Avertissement";
  desc: string;
}

interface Creneau {
  id: string;
  classe_id: string;
  enseignant_id: string | null;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  classes?: { nom: string } | null;
  enseignants?: { nom: string; prenom: string } | null;
  matieres?: { nom: string } | null;
}

const overlaps = (aD: string, aF: string, bD: string, bF: string) => aD < bF && bD < aF;

export default function Conflicts() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const scan = useCallback(async () => {
    if (!ecoleId || !anneeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("creneaux_emploi_temps" as any)
      .select("id, classe_id, enseignant_id, jour, heure_debut, heure_fin, salle, classes(nom), enseignants(nom, prenom), matieres(nom)")
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId);

    if (error) { console.error(error); setLoading(false); return; }

    const items = (data as any[]) as Creneau[];
    const found: Conflict[] = [];

    // Compare pairs
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.jour !== b.jour) continue;
        if (!overlaps(a.heure_debut, a.heure_fin, b.heure_debut, b.heure_fin)) continue;
        const slot = `${JOURS[a.jour]} ${a.heure_debut.slice(0, 5)}-${a.heure_fin.slice(0, 5)}`;
        if (a.enseignant_id && a.enseignant_id === b.enseignant_id) {
          const n = a.enseignants ? `${a.enseignants.prenom} ${a.enseignants.nom}` : "Enseignant";
          found.push({ type: "Enseignant", severity: "Critique", desc: `${n} assigné à ${a.classes?.nom ?? "?"} et ${b.classes?.nom ?? "?"} — ${slot}.` });
        }
        if (a.salle && b.salle && a.salle.trim() && a.salle === b.salle) {
          found.push({ type: "Salle", severity: "Critique", desc: `Salle ${a.salle} occupée par ${a.classes?.nom ?? "?"} et ${b.classes?.nom ?? "?"} — ${slot}.` });
        }
        if (a.classe_id === b.classe_id) {
          found.push({ type: "Classe", severity: "Critique", desc: `${a.classes?.nom ?? "Classe"} a deux cours simultanés — ${slot}.` });
        }
      }
    }
    setConflicts(found);
    setLastRun(new Date());
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => { scan(); }, [scan]);

  return (
    <SettingsSection
      title="Conflits & alertes"
      description="Détection automatique des chevauchements d'enseignants, salles et classes."
      icon={<AlertTriangle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
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
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${c.severity === "Critique" ? "text-destructive" : "text-primary"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{c.type}</span>
                  <Badge variant={c.severity === "Critique" ? "destructive" : "secondary"}>{c.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
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
