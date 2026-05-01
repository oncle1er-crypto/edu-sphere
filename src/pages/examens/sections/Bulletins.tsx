import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GraduationCap, Download, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";

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
  "Très bien": "bg-accent/15 text-accent",
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

  const computeBulletins = useCallback(async () => {
    if (!ecoleId || !selectedClasse) return;
    setLoading(true);

    // Get all notes for students in this class
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

    // Aggregate per student
    const map = new Map<string, { nom: string; prenom: string; matricule: string; sum: number; coefSum: number }>();
    for (const n of notesData as any[]) {
      const eid = n.eleve_id;
      const note = Number(n.note);
      const coef = Number(n.evaluations?.coefficient ?? 1);
      if (!map.has(eid)) {
        map.set(eid, {
          nom: n.eleves?.nom ?? "",
          prenom: n.eleves?.prenom ?? "",
          matricule: n.eleves?.matricule ?? "",
          sum: 0,
          coefSum: 0,
        });
      }
      const m = map.get(eid)!;
      m.sum += note * coef;
      m.coefSum += coef;
    }

    const list = Array.from(map.entries())
      .map(([id, v]) => ({
        eleve_id: id,
        nom: v.nom,
        prenom: v.prenom,
        matricule: v.matricule,
        moyenne: v.coefSum > 0 ? v.sum / v.coefSum : 0,
        rang: 0,
        totalEleves: map.size,
        mention: "",
      }))
      .sort((a, b) => b.moyenne - a.moyenne);

    list.forEach((r, i) => {
      r.rang = i + 1;
      r.mention = getMention(r.moyenne);
    });

    setRows(list);
    setLoading(false);
  }, [ecoleId, selectedClasse]);

  useEffect(() => {
    computeBulletins();
  }, [computeBulletins]);

  const handleDownloadPDF = (row: BulletinRow) => {
    toast.info("La génération PDF sera disponible prochainement.");
  };

  return (
    <SettingsSection
      icon={<GraduationCap className='h-5 w-5' />}
      title="Bulletins scolaires"
      description="Visualisez les moyennes et classements par classe."
    >
      <div className="mb-4 max-w-xs">
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadPDF(b)}>
                      <Download className="h-3.5 w-3.5" />
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
