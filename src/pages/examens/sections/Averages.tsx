import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

interface EleveAvg {
  eleve_id: string;
  nom: string;
  prenom: string;
  classe_nom: string;
  moyenne: number;
}

interface MatiereAvg {
  matiere: string;
  moyenne: number;
}

export default function Averages() {
  const { ecoleId } = useEcoleId();
  const [topEleves, setTopEleves] = useState<EleveAvg[]>([]);
  const [matiereAvgs, setMatiereAvgs] = useState<MatiereAvg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) return;
    setLoading(true);

    // Fetch all notes with student and eval info
    supabase
      .from("notes")
      .select("note, absent, eleve_id, eleves(nom, prenom, classes(nom)), evaluations(matiere_id, matieres(nom), coefficient)")
      .eq("ecole_id", ecoleId)
      .eq("absent", false)
      .not("note", "is", null)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setTopEleves([]);
          setMatiereAvgs([]);
          setLoading(false);
          return;
        }

        // Top students by average
        const eleveMap = new Map<string, { sum: number; coefSum: number; nom: string; prenom: string; classe_nom: string }>();
        const matMap = new Map<string, { sum: number; count: number }>();

        for (const n of data as any[]) {
          const note = Number(n.note);
          const coef = Number(n.evaluations?.coefficient ?? 1);
          const eid = n.eleve_id;

          // Eleve averages
          if (!eleveMap.has(eid)) {
            eleveMap.set(eid, {
              sum: 0, coefSum: 0,
              nom: n.eleves?.nom ?? "",
              prenom: n.eleves?.prenom ?? "",
              classe_nom: n.eleves?.classes?.nom ?? "",
            });
          }
          const em = eleveMap.get(eid)!;
          em.sum += note * coef;
          em.coefSum += coef;

          // Matiere averages
          const matNom = n.evaluations?.matieres?.nom ?? "Inconnue";
          if (!matMap.has(matNom)) matMap.set(matNom, { sum: 0, count: 0 });
          const mm = matMap.get(matNom)!;
          mm.sum += note;
          mm.count += 1;
        }

        const topList = Array.from(eleveMap.entries())
          .map(([id, v]) => ({
            eleve_id: id,
            nom: v.nom,
            prenom: v.prenom,
            classe_nom: v.classe_nom,
            moyenne: v.coefSum > 0 ? v.sum / v.coefSum : 0,
          }))
          .sort((a, b) => b.moyenne - a.moyenne)
          .slice(0, 10);

        const matList = Array.from(matMap.entries())
          .map(([nom, v]) => ({ matiere: nom, moyenne: v.count > 0 ? v.sum / v.count : 0 }))
          .sort((a, b) => b.moyenne - a.moyenne);

        setTopEleves(topList);
        setMatiereAvgs(matList);
        setLoading(false);
      });
  }, [ecoleId]);

  if (loading) {
    return (
      <SettingsSection icon={<Award className='h-5 w-5' />} title="Moyennes & classements" description="Chargement...">
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </SettingsSection>
    );
  }

  const empty = topEleves.length === 0 && matiereAvgs.length === 0;

  return (
    <SettingsSection icon={<Award className='h-5 w-5' />} title="Moyennes & classements" description="Top des élèves et moyennes par matière (basé sur les notes saisies).">
      {empty ? (
        <p className="text-center text-muted-foreground py-8">Aucune note saisie pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border">
            <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
              <h4 className="font-bold font-display text-primary">Top élèves</h4>
            </div>
            <CardContent className="p-0">
              <ul className="divide-y">
                {topEleves.map((t, i) => (
                  <li key={t.eleve_id} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.nom} {t.prenom}</p>
                      <p className="text-xs text-muted-foreground">{t.classe_nom}</p>
                    </div>
                    <p className="font-bold text-primary">{t.moyenne.toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border">
            <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
              <h4 className="font-bold font-display text-primary">Moyenne par matière</h4>
            </div>
            <CardContent className="p-6 space-y-4">
              {matiereAvgs.map((m) => (
                <div key={m.matiere}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{m.matiere}</span>
                    <span className="text-muted-foreground">{m.moyenne.toFixed(1)} / 20</span>
                  </div>
                  <Progress value={m.moyenne * 5} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </SettingsSection>
  );
}
