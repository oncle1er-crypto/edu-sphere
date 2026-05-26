import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_BULLETIN } from "@/components/help";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GraduationCap, Download, Loader2, FileDown } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";
import { generateBulletinPDF, type BulletinSubjectRow } from "@/lib/generateBulletinPDF";

interface BulletinRow {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  moyenne: number;
  rang: number;
  totalEleves: number;
  mention: string;
}

function getMention(m: number): string {
  if (m >= 16) return "Très bien";
  if (m >= 14) return "Bien";
  if (m >= 12) return "Assez bien";
  if (m >= 10) return "Passable";
  return "Insuffisant";
}

const mentionTone: Record<string, string> = {
  "Très bien": "bg-accent/15 text-primary",
  "Bien": "bg-primary/15 text-primary",
  "Assez bien": "bg-blue-500/15 text-blue-600",
  "Passable": "bg-orange-500/15 text-orange-600",
  "Insuffisant": "bg-destructive/15 text-destructive",
};

export default function Bulletins() {
  const { ecoleId } = useEcoleId();
  const { classes } = useClasses();
  const [selectedClasse, setSelectedClasse] = useState("");
  const [rows, setRows] = useState<BulletinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const computeBulletins = useCallback(async () => {
    if (!ecoleId || !selectedClasse) return;
    setLoading(true);

    const { data: notesData } = await supabase
      .from("notes")
      .select("note, absent, eleve_id, eleves!inner(nom, prenom, matricule, classe_id), evaluations(coefficient)")
      .eq("ecole_id", ecoleId)
      .eq("eleves.classe_id", selectedClasse)
      .eq("absent", false)
      .not("note", "is", null);

    if (!notesData || notesData.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const map = new Map<string, { nom: string; prenom: string; matricule: string; sum: number; coefSum: number }>();
    for (const n of notesData as any[]) {
      const eid = n.eleve_id;
      const note = Number(n.note);
      const coef = Number(n.evaluations?.coefficient ?? 1);
      if (!map.has(eid)) {
        map.set(eid, { nom: n.eleves?.nom ?? "", prenom: n.eleves?.prenom ?? "", matricule: n.eleves?.matricule ?? "", sum: 0, coefSum: 0 });
      }
      const m = map.get(eid)!;
      m.sum += note * coef;
      m.coefSum += coef;
    }

    const list = Array.from(map.entries())
      .map(([id, v]) => ({
        eleve_id: id, nom: v.nom, prenom: v.prenom, matricule: v.matricule,
        moyenne: v.coefSum > 0 ? v.sum / v.coefSum : 0, rang: 0, totalEleves: map.size, mention: "",
      }))
      .sort((a, b) => b.moyenne - a.moyenne);

    list.forEach((r, i) => { r.rang = i + 1; r.mention = getMention(r.moyenne); });
    setRows(list);
    setLoading(false);
  }, [ecoleId, selectedClasse]);

  useEffect(() => { computeBulletins(); }, [computeBulletins]);

  // Fetch detailed data and generate PDF for one student
  const buildPDFForStudent = async (row: BulletinRow) => {
    if (!ecoleId) return;

    // Fetch school info
    const { data: ecole } = await supabase.from("ecoles").select("nom, devise, adresse, telephone").eq("id", ecoleId).single();

    // Fetch student details
    const { data: eleve } = await supabase.from("eleves").select("date_naissance, sexe, classe_id, photo_url").eq("id", row.eleve_id).single();

    // Fetch class name
    const classeObj = classes.find((c) => c.id === selectedClasse);
    const className = classeObj?.nom ?? "—";

    // Fetch annee
    const { data: annee } = await supabase.from("annees_scolaires").select("libelle").eq("ecole_id", ecoleId).limit(1).single();

    // Fetch all notes for this student with matiere info
    const { data: studentNotes } = await supabase
      .from("notes")
      .select("note, absent, evaluations(matiere_id, coefficient, titre, matieres(nom))")
      .eq("ecole_id", ecoleId)
      .eq("eleve_id", row.eleve_id)
      .eq("absent", false)
      .not("note", "is", null);

    // Also fetch all notes for the class to compute class averages per subject
    const { data: allClassNotes } = await supabase
      .from("notes")
      .select("note, eleve_id, evaluations!inner(matiere_id, coefficient, classe_id)")
      .eq("ecole_id", ecoleId)
      .eq("evaluations.classe_id", selectedClasse)
      .eq("absent", false)
      .not("note", "is", null);

    // Build class avg per matiere
    const classAvgMap = new Map<string, { sum: number; count: number }>();
    for (const n of (allClassNotes ?? []) as any[]) {
      const mid = n.evaluations?.matiere_id;
      if (!mid) continue;
      if (!classAvgMap.has(mid)) classAvgMap.set(mid, { sum: 0, count: 0 });
      const e = classAvgMap.get(mid)!;
      e.sum += Number(n.note);
      e.count += 1;
    }

    // Aggregate student notes per matiere
    const matiereMap = new Map<string, { nom: string; sumNotes: number; sumCoef: number }>();
    for (const n of (studentNotes ?? []) as any[]) {
      const mid = n.evaluations?.matiere_id;
      const mnom = n.evaluations?.matieres?.nom ?? "Matière";
      const coef = Number(n.evaluations?.coefficient ?? 1);
      if (!matiereMap.has(mid)) matiereMap.set(mid, { nom: mnom, sumNotes: 0, sumCoef: 0 });
      const e = matiereMap.get(mid)!;
      e.sumNotes += Number(n.note) * coef;
      e.sumCoef += coef;
    }

    const matieres: BulletinSubjectRow[] = Array.from(matiereMap.entries()).map(([mid, v]) => {
      const avg = v.sumCoef > 0 ? v.sumNotes / v.sumCoef : 0;
      const classEntry = classAvgMap.get(mid);
      const moyClasse = classEntry && classEntry.count > 0 ? classEntry.sum / classEntry.count : 0;
      return {
        matiere: v.nom,
        note: avg,
        coefficient: v.sumCoef,
        moyenne_classe: moyClasse,
        appreciation: getMention(avg),
      };
    });

    const doc = await generateBulletinPDF({
      ecole: {
        nom: ecole?.nom ?? "COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE",
        devise: ecole?.devise ?? "Foi, Savoir, Excellence",
        adresse: ecole?.adresse ?? "Abidjan, Côte d'Ivoire",
        telephone: ecole?.telephone ?? "",
      },
      eleve: {
        nom: row.nom,
        prenom: row.prenom,
        matricule: row.matricule,
        date_naissance: eleve?.date_naissance ?? "",
        sexe: eleve?.sexe ?? "",
        photo_url: eleve?.photo_url ?? null,
      },
      classe: className,
      annee: annee?.libelle ?? "",
      periode: "Trimestre",
      matieres,
      moyenne_generale: row.moyenne,
      rang: row.rang,
      total_eleves: row.totalEleves,
      mention: row.mention,
    });

    return doc;
  };

  const handleDownloadPDF = async (row: BulletinRow) => {
    setGeneratingId(row.eleve_id);
    try {
      const doc = await buildPDFForStudent(row);
      if (doc) {
        doc.save(`Bulletin_${row.nom}_${row.prenom}.pdf`);
        toast.success(`Bulletin de ${row.nom} ${row.prenom} téléchargé.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du bulletin.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setGeneratingAll(true);
    try {
      for (const row of rows) {
        const doc = await buildPDFForStudent(row);
        if (doc) doc.save(`Bulletin_${row.nom}_${row.prenom}.pdf`);
      }
      toast.success(`${rows.length} bulletin(s) téléchargé(s).`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération des bulletins.");
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <SettingsSection
      icon={<GraduationCap className='h-5 w-5' />}
      title="Bulletins scolaires"
      description="Visualisez les moyennes et classements par classe."
    >
      <HelpBanner storageKey="exams-bulletins" title="Générer les bulletins">
        Sélectionnez une classe et une période pour visualiser les moyennes, classements et mentions. Téléchargez le bulletin PDF individuel ou la liasse complète de la classe.
      </HelpBanner>
      <StatusLegend title="Statuts d'un bulletin" items={STATUTS_BULLETIN} />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="max-w-xs flex-1">
          <Label className="text-xs">Classe</Label>
          <Select value={selectedClasse} onValueChange={setSelectedClasse}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" className="gap-2" disabled={generatingAll} onClick={handleDownloadAll}>
            {generatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Télécharger tous les bulletins
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !selectedClasse ? (
        <p className="text-center text-muted-foreground py-8">Sélectionnez une classe pour voir les bulletins.</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune note saisie pour cette classe.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Rang</TableHead>
                <TableHead>Mention</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.eleve_id}>
                  <TableCell className="font-mono text-xs">{b.matricule}</TableCell>
                  <TableCell className="font-medium">{b.nom} {b.prenom}</TableCell>
                  <TableCell className="font-bold text-primary">{b.moyenne.toFixed(2)}</TableCell>
                  <TableCell>{b.rang} / {b.totalEleves}</TableCell>
                  <TableCell>
                    <Badge className={mentionTone[b.mention] || ""} variant="secondary">{b.mention}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={generatingId === b.eleve_id}
                      onClick={() => handleDownloadPDF(b)}
                    >
                      {generatingId === b.eleve_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
