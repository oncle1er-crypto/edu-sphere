import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Loader2, ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Field = "matricule" | "matricule_national" | "nom" | "prenom" | "date_naissance" | "lieu_naissance";

type Mapping = Record<Field, string | "">;

type ReportRow = {
  ligne: number;
  matricule_national: string | null;
  eleve_id: string | null;
  eleve_nom: string | null;
  resultat: "ok" | "non_trouve" | "ambigu" | "doublon_fichier" | "conflit_base" | "erreur";
  detail: string | null;
};

const MAX_ROWS = 1000;

const FIELD_LABELS: Record<Field, string> = {
  matricule: "Matricule interne",
  matricule_national: "Matricule national *",
  nom: "Nom",
  prenom: "Prénom",
  date_naissance: "Date de naissance",
  lieu_naissance: "Lieu de naissance",
};

const AUTO_DETECT: Record<Field, string[]> = {
  matricule: ["matricule_interne", "matricule interne", "matricule"],
  matricule_national: ["matricule_national", "matricule national", "matricule_nat", "national"],
  nom: ["nom", "name", "lastname"],
  prenom: ["prenom", "prénom", "prenoms", "prénoms", "firstname"],
  date_naissance: ["date_naissance", "date de naissance", "date naissance", "dob"],
  lieu_naissance: ["lieu_naissance", "lieu de naissance", "lieu naissance", "pob"],
};

function detectSep(line: string): string {
  const sc = (line.match(/;/g) ?? []).length;
  const cc = (line.match(/,/g) ?? []).length;
  return cc > sc ? "," : ";";
}

function parseCSV(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { cur.push(cell); cell = ""; }
      else if (c === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v && v.trim().length));
}

function toIsoDate(v: string): string {
  const s = v.trim();
  if (!s) return "";
  const m = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return s;
  return s;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function badgeFor(r: ReportRow["resultat"]) {
  switch (r) {
    case "ok": return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">OK</Badge>;
    case "non_trouve": return <Badge variant="secondary">Non trouvé</Badge>;
    case "ambigu": return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Ambigu</Badge>;
    case "doublon_fichier": return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Doublon fichier</Badge>;
    case "conflit_base": return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Conflit base</Badge>;
    case "erreur": return <Badge variant="destructive">Erreur</Badge>;
  }
}

export function SigfneImportDialog({
  open, onOpenChange, ecoleId, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ecoleId: string | null;
  onImported: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    matricule: "", matricule_national: "", nom: "", prenom: "", date_naissance: "", lieu_naissance: "",
  });
  const [dryReport, setDryReport] = useState<ReportRow[] | null>(null);
  const [finalReport, setFinalReport] = useState<ReportRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1); setHeaders([]); setDataRows([]);
    setMapping({ matricule: "", matricule_national: "", nom: "", prenom: "", date_naissance: "", lieu_naissance: "" });
    setDryReport(null); setFinalReport(null); setRunning(false);
  };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const downloadTemplate = () => {
    const csv = "MATRICULE_INTERNE;MATRICULE_NATIONAL;NOM;PRENOM;DATE_NAISSANCE;LIEU_NAISSANCE\r\nE001;1234567890;KOUAME;Jean;01/09/2015;Abidjan\r\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "modele_import_sigfne.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = String(ev.target?.result ?? "");
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const sep = detectSep(firstLine);
      const parsed = parseCSV(text, sep);
      if (parsed.length < 2) { toast.error("Fichier vide ou invalide"); return; }
      const hdr = parsed[0].map((h) => h.trim());
      const body = parsed.slice(1);
      if (body.length > MAX_ROWS) {
        toast.error(`Le fichier contient ${body.length} lignes. Maximum ${MAX_ROWS} lignes par import.`);
        return;
      }
      setHeaders(hdr);
      setDataRows(body);
      // auto-detect mapping
      const nm: Mapping = { matricule: "", matricule_national: "", nom: "", prenom: "", date_naissance: "", lieu_naissance: "" };
      (Object.keys(nm) as Field[]).forEach((k) => {
        const cand = AUTO_DETECT[k];
        const found = hdr.find((h) => cand.includes(normalize(h)));
        if (found) nm[k] = found;
      });
      setMapping(nm);
      setStep(2);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const buildPayload = () => {
    const idx: Partial<Record<Field, number>> = {};
    (Object.keys(mapping) as Field[]).forEach((k) => {
      const h = mapping[k];
      if (h) { const i = headers.indexOf(h); if (i >= 0) idx[k] = i; }
    });
    return dataRows.map((r) => {
      const obj: Record<string, string> = {};
      (Object.keys(idx) as Field[]).forEach((k) => {
        let v = (r[idx[k] as number] ?? "").trim();
        if (k === "date_naissance") v = toIsoDate(v);
        if (v) obj[k] = v;
      });
      return obj;
    }).filter((o) => Object.keys(o).length > 0);
  };

  const runDryRun = async () => {
    if (!ecoleId) return;
    if (!mapping.matricule_national) { toast.error("La colonne « matricule national » est obligatoire"); return; }
    const rows = buildPayload();
    if (!rows.length) { toast.error("Aucune ligne exploitable"); return; }
    setRunning(true);
    const { data, error } = await (supabase as any).rpc("import_matricules_sigfne", {
      p_ecole_id: ecoleId, p_rows: rows, p_dry_run: true,
    });
    setRunning(false);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setDryReport((data ?? []) as ReportRow[]);
    setStep(3);
  };

  const applyImport = async () => {
    if (!ecoleId) return;
    const rows = buildPayload();
    setRunning(true);
    const { data, error } = await (supabase as any).rpc("import_matricules_sigfne", {
      p_ecole_id: ecoleId, p_rows: rows, p_dry_run: false,
    });
    setRunning(false);
    if (error) { toast.error(messageErreurBase(error)); return; }
    setFinalReport((data ?? []) as ReportRow[]);
    toast.success("Import appliqué");
    onImported();
  };

  const counts = useMemo(() => {
    const rep = finalReport ?? dryReport ?? [];
    const c = { ok: 0, non_trouve: 0, ambigu: 0, doublon_fichier: 0, conflit_base: 0, erreur: 0 } as Record<ReportRow["resultat"], number>;
    rep.forEach((r) => { c[r.resultat] = (c[r.resultat] ?? 0) + 1; });
    return c;
  }, [dryReport, finalReport]);

  const previewRows = dataRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import matricules SIGFNE — Étape {step}/3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Fichier <strong>CSV</strong> (séparateur <code>;</code> ou <code>,</code>, encodage UTF-8). Max {MAX_ROWS} lignes.
              </p>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Sélectionner un fichier
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Besoin d'un modèle ?</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Télécharger le modèle CSV
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {dataRows.length} ligne(s) détectée(s). Associez chaque champ à une colonne du fichier.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS[f]}</Label>
                  <Select value={mapping[f] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Aucune —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold mb-1">Aperçu (5 premières lignes)</p>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>{headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, i) => (
                      <TableRow key={i}>
                        {headers.map((_, j) => <TableCell key={j} className="text-xs">{r[j] ?? ""}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">OK : {counts.ok}</Badge>
              <Badge variant="secondary">Non trouvé : {counts.non_trouve}</Badge>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Ambigu : {counts.ambigu}</Badge>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Doublon fichier : {counts.doublon_fichier}</Badge>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Conflit base : {counts.conflit_base}</Badge>
              <Badge variant="destructive">Erreur : {counts.erreur}</Badge>
            </div>

            {finalReport && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" /> Import appliqué avec succès.
              </div>
            )}

            <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Matricule national</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(finalReport ?? dryReport ?? []).map((r) => (
                    <TableRow key={r.ligne}>
                      <TableCell className="text-xs text-muted-foreground">{r.ligne}</TableCell>
                      <TableCell className="text-xs font-mono">{r.matricule_national ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.eleve_nom ?? "—"}</TableCell>
                      <TableCell>{badgeFor(r.resultat)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.detail ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => { setStep(1); setHeaders([]); setDataRows([]); }}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              <Button onClick={runDryRun} disabled={running || !mapping.matricule_national}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Prévisualiser
              </Button>
            </>
          )}
          {step === 3 && !finalReport && (
            <>
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              <Button onClick={applyImport} disabled={running || counts.ok === 0}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Appliquer l'import ({counts.ok} élève{counts.ok > 1 ? "s" : ""})
              </Button>
            </>
          )}
          {step === 3 && finalReport && (
            <Button onClick={() => handleClose(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
