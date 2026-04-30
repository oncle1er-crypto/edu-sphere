import { useMemo, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Scale, Plus, Trash2, Copy, Calculator } from "lucide-react";
import { toast } from "sonner";

type Subject = {
  id: string;
  nom: string;
  coefficient: number;
  noteMax: number;
  noteMin: number;
  type: "principale" | "secondaire" | "option";
};

const CLASSES = [
  { id: "mat-ps", label: "Maternelle - Petite Section", cycle: "Maternelle" },
  { id: "mat-ms", label: "Maternelle - Moyenne Section", cycle: "Maternelle" },
  { id: "mat-gs", label: "Maternelle - Grande Section", cycle: "Maternelle" },
  { id: "cp", label: "CP", cycle: "Primaire" },
  { id: "ce1", label: "CE1", cycle: "Primaire" },
  { id: "ce2", label: "CE2", cycle: "Primaire" },
  { id: "cm1", label: "CM1", cycle: "Primaire" },
  { id: "cm2", label: "CM2", cycle: "Primaire" },
  { id: "6e", label: "6ème", cycle: "Collège" },
  { id: "5e", label: "5ème", cycle: "Collège" },
  { id: "4e", label: "4ème", cycle: "Collège" },
  { id: "3e", label: "3ème", cycle: "Collège" },
  { id: "2nde", label: "2nde", cycle: "Lycée" },
  { id: "1ere-s", label: "1ère Scientifique", cycle: "Lycée" },
  { id: "1ere-l", label: "1ère Littéraire", cycle: "Lycée" },
  { id: "tle-s", label: "Terminale Scientifique", cycle: "Lycée" },
  { id: "tle-l", label: "Terminale Littéraire", cycle: "Lycée" },
  { id: "l1-info", label: "Licence 1 Informatique", cycle: "Université" },
  { id: "l2-info", label: "Licence 2 Informatique", cycle: "Université" },
];

const DEFAULTS: Record<string, Subject[]> = {
  "6e": [
    { id: "1", nom: "Mathématiques", coefficient: 4, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "2", nom: "Français", coefficient: 4, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "3", nom: "Anglais (LV1)", coefficient: 3, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "4", nom: "Histoire-Géographie", coefficient: 3, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "5", nom: "Sciences de la Vie et de la Terre", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "6", nom: "Physique-Chimie", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "7", nom: "Éducation Physique et Sportive", coefficient: 1, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "8", nom: "Arts Plastiques", coefficient: 1, noteMax: 20, noteMin: 0, type: "option" },
    { id: "9", nom: "Éducation Musicale", coefficient: 1, noteMax: 20, noteMin: 0, type: "option" },
  ],
  "tle-s": [
    { id: "1", nom: "Mathématiques", coefficient: 7, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "2", nom: "Physique-Chimie", coefficient: 6, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "3", nom: "SVT", coefficient: 6, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "4", nom: "Philosophie", coefficient: 3, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "5", nom: "Histoire-Géographie", coefficient: 3, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "6", nom: "Anglais (LV1)", coefficient: 3, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "7", nom: "Espagnol (LV2)", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "8", nom: "EPS", coefficient: 2, noteMax: 20, noteMin: 0, type: "option" },
  ],
  cm2: [
    { id: "1", nom: "Français", coefficient: 4, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "2", nom: "Mathématiques", coefficient: 4, noteMax: 20, noteMin: 0, type: "principale" },
    { id: "3", nom: "Sciences", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "4", nom: "Histoire-Géographie", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "5", nom: "Anglais", coefficient: 2, noteMax: 20, noteMin: 0, type: "secondaire" },
    { id: "6", nom: "EPS", coefficient: 1, noteMax: 20, noteMin: 0, type: "option" },
    { id: "7", nom: "Arts Plastiques", coefficient: 1, noteMax: 20, noteMin: 0, type: "option" },
  ],
};

const FALLBACK: Subject[] = [
  { id: "1", nom: "Matière 1", coefficient: 2, noteMax: 20, noteMin: 0, type: "principale" },
  { id: "2", nom: "Matière 2", coefficient: 2, noteMax: 20, noteMin: 0, type: "principale" },
  { id: "3", nom: "Matière 3", coefficient: 1, noteMax: 20, noteMin: 0, type: "secondaire" },
];

const MENTIONS_DEFAULT = [
  { min: 16, label: "Très Bien", couleur: "Vert" },
  { min: 14, label: "Bien", couleur: "Bleu" },
  { min: 12, label: "Assez Bien", couleur: "Jaune" },
  { min: 10, label: "Passable", couleur: "Orange" },
  { min: 0, label: "Insuffisant", couleur: "Rouge" },
];

const typeBadge = (t: Subject["type"]) => {
  if (t === "principale") return <Badge>Principale</Badge>;
  if (t === "secondaire") return <Badge variant="secondary">Secondaire</Badge>;
  return <Badge variant="outline">Option</Badge>;
};

export default function GradingScales() {
  const [classeId, setClasseId] = useState<string>("6e");
  const [data, setData] = useState<Record<string, Subject[]>>(DEFAULTS);
  const [mentions, setMentions] = useState(MENTIONS_DEFAULT);

  const subjects = useMemo<Subject[]>(
    () => data[classeId] ?? FALLBACK,
    [data, classeId]
  );

  const totalCoef = useMemo(
    () => subjects.reduce((s, x) => s + (Number(x.coefficient) || 0), 0),
    [subjects]
  );

  const updateSubject = (id: string, patch: Partial<Subject>) => {
    setData((d) => ({
      ...d,
      [classeId]: (d[classeId] ?? FALLBACK).map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    }));
  };

  const addSubject = () => {
    const newRow: Subject = {
      id: crypto.randomUUID(),
      nom: "Nouvelle matière",
      coefficient: 1,
      noteMax: 20,
      noteMin: 0,
      type: "secondaire",
    };
    setData((d) => ({ ...d, [classeId]: [...(d[classeId] ?? FALLBACK), newRow] }));
  };

  const removeSubject = (id: string) => {
    setData((d) => ({
      ...d,
      [classeId]: (d[classeId] ?? []).filter((s) => s.id !== id),
    }));
  };

  const duplicateToCycle = () => {
    const cycle = CLASSES.find((c) => c.id === classeId)?.cycle;
    if (!cycle) return;
    const targets = CLASSES.filter((c) => c.cycle === cycle && c.id !== classeId).map((c) => c.id);
    setData((d) => {
      const copy = { ...d };
      const source = (d[classeId] ?? FALLBACK).map((s) => ({ ...s, id: crypto.randomUUID() }));
      targets.forEach((t) => (copy[t] = source.map((s) => ({ ...s, id: crypto.randomUUID() }))));
      return copy;
    });
    toast.success("Grille dupliquée", {
      description: `Appliquée à toutes les classes du cycle ${cycle}.`,
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Scale className="h-5 w-5" />}
        title="Grilles de notes & coefficients"
        description="Configurez le barème, les matières et les coefficients pour chaque classe."
        onSave={() =>
          toast.success("Grille enregistrée", {
            description: `${CLASSES.find((c) => c.id === classeId)?.label} – ${subjects.length} matière(s).`,
          })
        }
      >
        <FieldRow label="Classe" hint="Sélectionnez la classe à configurer">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={classeId} onValueChange={setClasseId}>
              <SelectTrigger className="sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(CLASSES.map((c) => c.cycle))).map((cycle) => (
                  <div key={cycle}>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {cycle}
                    </div>
                    {CLASSES.filter((c) => c.cycle === cycle).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={duplicateToCycle}>
              <Copy className="h-4 w-4" />
              Dupliquer au cycle
            </Button>
          </div>
        </FieldRow>

        <Tabs defaultValue="matieres" className="w-full">
          <TabsList>
            <TabsTrigger value="matieres">Matières & coefficients</TabsTrigger>
            <TabsTrigger value="bareme">Barème & note max</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>

          <TabsContent value="matieres" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Total coefficients :</span>
                <Badge variant="secondary" className="font-bold">{totalCoef}</Badge>
                <span className="text-muted-foreground ml-3">Matières :</span>
                <Badge variant="secondary" className="font-bold">{subjects.length}</Badge>
              </div>
              <Button size="sm" onClick={addSubject}>
                <Plus className="h-4 w-4" />
                Ajouter une matière
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Matière</TableHead>
                    <TableHead className="w-32">Coefficient</TableHead>
                    <TableHead className="w-32">Note max</TableHead>
                    <TableHead className="w-32">Note min</TableHead>
                    <TableHead className="w-40">Type</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input
                          value={s.nom}
                          onChange={(e) => updateSubject(s.id, { nom: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={s.coefficient}
                          onChange={(e) =>
                            updateSubject(s.id, { coefficient: Number(e.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={s.noteMax}
                          onChange={(e) =>
                            updateSubject(s.id, { noteMax: Number(e.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={s.noteMin}
                          onChange={(e) =>
                            updateSubject(s.id, { noteMin: Number(e.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={s.type}
                          onValueChange={(v) =>
                            updateSubject(s.id, { type: v as Subject["type"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="principale">Principale</SelectItem>
                            <SelectItem value="secondaire">Secondaire</SelectItem>
                            <SelectItem value="option">Option</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSubject(s.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Aucune matière. Cliquez sur "Ajouter une matière".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg bg-muted/40 border p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Aperçu de la répartition</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-md bg-card border px-2 py-1">
                    {typeBadge(s.type)}
                    <span className="font-medium text-foreground">{s.nom}</span>
                    <span className="text-muted-foreground">× {s.coefficient}</span>
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bareme" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FieldRow label="Note maximale par défaut">
                <Input type="number" defaultValue={20} />
              </FieldRow>
              <FieldRow label="Note minimale par défaut">
                <Input type="number" defaultValue={0} />
              </FieldRow>
              <FieldRow label="Note de passage">
                <Input type="number" defaultValue={10} />
              </FieldRow>
              <FieldRow label="Décimales affichées">
                <Select defaultValue="2">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (entiers)</SelectItem>
                    <SelectItem value="1">1 décimale</SelectItem>
                    <SelectItem value="2">2 décimales</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
          </TabsContent>

          <TabsContent value="mentions" className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Seuil ≥</TableHead>
                    <TableHead>Mention</TableHead>
                    <TableHead className="w-40">Couleur</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mentions.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          type="number"
                          value={m.min}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setMentions((arr) => arr.map((x, j) => (j === i ? { ...x, min: v } : x)));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={m.label}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMentions((arr) => arr.map((x, j) => (j === i ? { ...x, label: v } : x)));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={m.couleur}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMentions((arr) => arr.map((x, j) => (j === i ? { ...x, couleur: v } : x)));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setMentions((arr) => arr.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMentions((arr) => [...arr, { min: 0, label: "Nouvelle mention", couleur: "Gris" }])
              }
            >
              <Plus className="h-4 w-4" />
              Ajouter une mention
            </Button>
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </div>
  );
}
