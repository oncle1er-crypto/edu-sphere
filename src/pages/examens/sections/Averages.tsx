import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Award, Loader2, TrendingUp, Medal, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useClasses } from "@/hooks/useClasses";
import { useEcoles } from "@/context/EcoleContext";
import { getHonorRollThreshold, DEFAULT_HONOR_ROLL_THRESHOLD } from "@/lib/honorRoll";
import { generateTableauHonneurPDF } from "@/lib/generateDocumentsPDF";
import { toast } from "sonner";

interface EleveAvg {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe_nom: string;
  moyenne: number;
  rang: number;
  mention: string;
}

interface MatiereAvg {
  matiere: string;
  moyenne: number;
  min: number;
  max: number;
  count: number;
}

function getMention(m: number): string {
  if (m >= 16) return "Très bien";
  if (m >= 14) return "Bien";
  if (m >= 12) return "Assez bien";
  if (m >= 10) return "Passable";
  return "Insuffisant";
}

const mentionColor: Record<string, string> = {
  "Très bien": "bg-accent/15 text-primary",
  "Bien": "bg-primary/15 text-primary",
  "Assez bien": "bg-blue-500/15 text-blue-600",
  "Passable": "bg-orange-500/15 text-orange-600",
  "Insuffisant": "bg-destructive/15 text-destructive",
};

export default function Averages() {
  const { ecoleId } = useEcoleId();
  const { classes } = useClasses();
  const { currentEcole } = useEcoles();
  const [selectedClasse, setSelectedClasse] = useState("");
  const [topEleves, setTopEleves] = useState<EleveAvg[]>([]);
  const [matiereAvgs, setMatiereAvgs] = useState<MatiereAvg[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({ moyenne: 0, admis: 0, total: 0 });
  const [threshold, setThreshold] = useState<number>(DEFAULT_HONOR_ROLL_THRESHOLD);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    setThreshold(getHonorRollThreshold());
    const onChange = () => setThreshold(getHonorRollThreshold());
    window.addEventListener("honor-roll-threshold-changed", onChange);
    return () => window.removeEventListener("honor-roll-threshold-changed", onChange);
  }, []);

  const printHonneur = async (t: EleveAvg) => {
    setPrintingId(t.eleve_id);
    try {
      const doc = await generateTableauHonneurPDF({
        ecole: {
          nom: currentEcole?.nom ?? "Groupe Scolaire La Providence",
          devise: "Foi, Savoir, Excellence",
          adresse: currentEcole?.adresse ?? "Abidjan, Côte d'Ivoire",
          telephone: currentEcole?.telephone ?? "+225",
          directeur: currentEcole?.directeur ?? "",
          logoUrl: (currentEcole as any)?.logo_url ?? null,
        },
        eleve: { nom: t.nom, prenom: t.prenom, matricule: t.matricule },
        classe: t.classe_nom || "—",
        annee: (() => {
          const now = new Date();
          const y = now.getFullYear();
          return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
        })(),
        moyenne: t.moyenne,
        rang: t.rang,
        effectif: topEleves.length,
        mention: t.mention,
        seuil: threshold,
      });
      doc.autoPrint();
      const url = doc.output("bloburl");
      const w = window.open(url as unknown as string, "_blank");
      if (!w) toast.error("Pop-up bloquée — autorisez les fenêtres.");
      else toast.success("Tableau d'honneur prêt à imprimer");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setPrintingId(null);
    }
  };


  useEffect(() => {
    if (!ecoleId) return;
    setLoading(true);

    let query = supabase
      .from("notes")
      .select("note, absent, eleve_id, eleves!inner(nom, prenom, classe_id, matricule, classes(nom)), evaluations(matiere_id, matieres(nom), coefficient)")
      .eq("ecole_id", ecoleId)
      .eq("absent", false)
      .not("note", "is", null);

    if (selectedClasse) {
      query = query.eq("eleves.classe_id", selectedClasse);
    }

    query.then(({ data }) => {
      if (!data || data.length === 0) {
        setTopEleves([]);
        setMatiereAvgs([]);
        setGlobalStats({ moyenne: 0, admis: 0, total: 0 });
        setLoading(false);
        return;
      }

      // Aggregate per student (weighted by coefficient)
      const eleveMap = new Map<string, { sum: number; coefSum: number; nom: string; prenom: string; matricule: string; classe_nom: string }>();
      const matMap = new Map<string, { sum: number; count: number; min: number; max: number }>();

      for (const n of data as any[]) {
        const note = Number(n.note);
        const coef = Number(n.evaluations?.coefficient ?? 1);
        const eid = n.eleve_id;

        if (!eleveMap.has(eid)) {
          eleveMap.set(eid, {
            sum: 0, coefSum: 0,
            nom: n.eleves?.nom ?? "",
            prenom: n.eleves?.prenom ?? "",
            matricule: n.eleves?.matricule ?? "",
            classe_nom: n.eleves?.classes?.nom ?? "",
          });
        }
        const em = eleveMap.get(eid)!;
        em.sum += note * coef;
        em.coefSum += coef;

        const matNom = n.evaluations?.matieres?.nom ?? "Inconnue";
        if (!matMap.has(matNom)) matMap.set(matNom, { sum: 0, count: 0, min: 20, max: 0 });
        const mm = matMap.get(matNom)!;
        mm.sum += note;
        mm.count += 1;
        mm.min = Math.min(mm.min, note);
        mm.max = Math.max(mm.max, note);
      }

      const list: EleveAvg[] = Array.from(eleveMap.entries())
        .map(([id, v]) => {
          const moyenne = v.coefSum > 0 ? v.sum / v.coefSum : 0;
          return {
            eleve_id: id,
            nom: v.nom,
            prenom: v.prenom,
            matricule: v.matricule,
            classe_nom: v.classe_nom,
            moyenne,
            rang: 0,
            mention: getMention(moyenne),
          };
        })
        .sort((a, b) => b.moyenne - a.moyenne);

      list.forEach((r, i) => { r.rang = i + 1; });

      const totalMoyenne = list.length > 0 ? list.reduce((s, l) => s + l.moyenne, 0) / list.length : 0;
      const admis = list.filter(l => l.moyenne >= 10).length;

      setGlobalStats({ moyenne: totalMoyenne, admis, total: list.length });
      setTopEleves(list);

      setMatiereAvgs(
        Array.from(matMap.entries())
          .map(([nom, v]) => ({
            matiere: nom,
            moyenne: v.count > 0 ? v.sum / v.count : 0,
            min: v.min,
            max: v.max,
            count: v.count,
          }))
          .sort((a, b) => b.moyenne - a.moyenne)
      );

      setLoading(false);
    });
  }, [ecoleId, selectedClasse]);

  return (
    <SettingsSection icon={<Award className='h-5 w-5' />} title="Moyennes & classements" description="Classements automatiques basés sur les notes enregistrées.">
      <div className="mb-4 max-w-xs">
        <Label className="text-xs">Filtrer par classe</Label>
        <Select value={selectedClasse} onValueChange={setSelectedClasse}>
          <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : topEleves.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune note saisie pour le moment.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{globalStats.moyenne.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Moyenne générale</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{globalStats.total}</p>
                <p className="text-xs text-muted-foreground">Élèves classés</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{globalStats.admis}</p>
                <p className="text-xs text-muted-foreground">Moyenne ≥ 10</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{globalStats.total - globalStats.admis}</p>
                <p className="text-xs text-muted-foreground">Moyenne &lt; 10</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top students */}
            <Card className="border">
              <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  <h4 className="font-bold font-display text-primary">Classement des élèves</h4>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Tableau d'honneur ≥ {threshold.toFixed(2)}
                </span>
              </div>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <ul className="divide-y">
                  {topEleves.map((t) => {
                    const eligible = t.moyenne >= threshold;
                    return (
                      <li key={t.eleve_id} className="flex items-center gap-3 px-6 py-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          t.rang <= 3 ? "bg-accent/20 text-primary" : "bg-primary/10 text-primary"
                        }`}>
                          {t.rang}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{t.nom} {t.prenom}</p>
                          <p className="text-xs text-muted-foreground">{t.classe_nom}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{t.moyenne.toFixed(2)}</p>
                          <Badge className={`text-[10px] ${mentionColor[t.mention] || ""}`} variant="secondary">
                            {t.mention}
                          </Badge>
                        </div>
                        {eligible && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={() => printHonneur(t)}
                            disabled={printingId === t.eleve_id}
                            title="Imprimer le tableau d'honneur"
                          >
                            {printingId === t.eleve_id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Printer className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Honneur</span>
                          </Button>
                        )}
                      </li>
                    );
                  })}
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Subject averages */}
            <Card className="border">
              <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="font-bold font-display text-primary">Moyenne par matière</h4>
              </div>
              <CardContent className="p-6 space-y-4">
                {matiereAvgs.map((m) => (
                  <div key={m.matiere}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.matiere}</span>
                      <span className="text-muted-foreground">{m.moyenne.toFixed(1)} / 20</span>
                    </div>
                    <Progress value={m.moyenne * 5} className="h-2" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>Min: {m.min.toFixed(1)}</span>
                      <span>{m.count} notes</span>
                      <span>Max: {m.max.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
