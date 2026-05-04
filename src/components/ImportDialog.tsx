import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ImportColumn[];
  exampleRows: Record<string, string>[];
  exampleFileName: string;
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: number }>;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ";" && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function generateCSV(columns: ImportColumn[], rows: Record<string, string>[]): string {
  const header = columns.map((c) => c.label).join(";");
  const body = rows.map((r) => columns.map((c) => r[c.key] ?? "").join(";")).join("\n");
  return `${header}\n${body}`;
}

export function ImportDialog({ open, onOpenChange, title, columns, exampleRows, exampleFileName, onImport }: ImportDialogProps) {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setParsedRows([]); setResult(null); };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadExample = () => {
    const csv = generateCSV(columns, exampleRows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exampleFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { toast.error("Le fichier est vide ou invalide"); return; }
      const headers = parsed[0].map((h) => h.toLowerCase().trim());
      const colMap = columns.map((col) => {
        const idx = headers.findIndex((h) =>
          h === col.label.toLowerCase() || h === col.key.toLowerCase()
        );
        return { key: col.key, idx };
      });
      const rows = parsed.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        colMap.forEach(({ key, idx }) => {
          obj[key] = idx >= 0 ? (row[idx] ?? "") : "";
        });
        return obj;
      }).filter((r) => Object.values(r).some((v) => v));
      setParsedRows(rows);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [columns]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await onImport(parsedRows);
      setResult(res);
      if (res.success > 0) toast.success(`${res.success} ligne(s) importée(s)`);
      if (res.errors > 0) toast.error(`${res.errors} ligne(s) en erreur`);
    } catch {
      toast.error("Erreur lors de l'import");
    }
    setImporting(false);
  };

  const requiredKeys = columns.filter((c) => c.required).map((c) => c.key);
  const invalidRows = parsedRows.filter((r) => requiredKeys.some((k) => !r[k]));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {!result && parsedRows.length === 0 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Glissez un fichier CSV (séparateur <code>;</code>) ou cliquez pour sélectionner
              </p>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Sélectionner un fichier
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Pas encore de fichier ? Téléchargez le modèle d'exemple
              </p>
              <Button variant="outline" size="sm" onClick={downloadExample}>
                <Download className="h-4 w-4" /> Fichier d'exemple
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Colonnes attendues :</strong></p>
              <div className="flex flex-wrap gap-1">
                {columns.map((c) => (
                  <Badge key={c.key} variant={c.required ? "default" : "outline"} className="text-[10px]">
                    {c.label}{c.required ? " *" : ""}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {parsedRows.length} ligne(s) détectée(s)
                {invalidRows.length > 0 && (
                  <span className="text-destructive ml-2">
                    <AlertTriangle className="inline h-3.5 w-3.5" /> {invalidRows.length} incomplète(s)
                  </span>
                )}
              </p>
              <Button variant="ghost" size="sm" onClick={reset}>Changer de fichier</Button>
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c.key} className="text-xs whitespace-nowrap">{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 50).map((r, i) => {
                    const invalid = requiredKeys.some((k) => !r[k]);
                    return (
                      <TableRow key={i} className={invalid ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.key} className="text-xs">
                            {r[c.key] || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">… et {parsedRows.length - 50} autres lignes</p>
            )}
          </div>
        )}

        {result && (
          <div className="text-center space-y-3 py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="text-lg font-semibold">Import terminé</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-600">{result.success} réussie(s)</span>
              {result.errors > 0 && <span className="text-destructive">{result.errors} erreur(s)</span>}
            </div>
          </div>
        )}

        <DialogFooter>
          {!result && parsedRows.length > 0 && (
            <Button onClick={handleImport} disabled={importing || parsedRows.length === 0}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {parsedRows.length - invalidRows.length} ligne(s)
            </Button>
          )}
          {result && (
            <Button onClick={() => handleClose(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
