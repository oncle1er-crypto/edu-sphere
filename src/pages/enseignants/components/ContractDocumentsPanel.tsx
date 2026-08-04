import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Download, Trash2, Upload, FileText } from "lucide-react";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface DocFile {
  name: string;
  size: number;
  updated_at: string;
  fullPath: string;
}

const BUCKET = "contrats-enseignants";

export function ContractDocumentsPanel() {
  const { ecoleId } = useEcoleId();
  const { enseignants } = useEnseignants();
  const [selected, setSelected] = useState<string>("");
  const [files, setFiles] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (enseignants.length && !selected) setSelected(enseignants[0].id);
  }, [enseignants, selected]);

  const load = async () => {
    if (!ecoleId || !selected) return;
    const folder = `${ecoleId}/${selected}`;
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) { console.error(error); setFiles([]); return; }
    setFiles((data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder").map((f) => ({
      name: f.name,
      size: (f as any).metadata?.size ?? 0,
      updated_at: f.updated_at ?? f.created_at ?? "",
      fullPath: `${folder}/${f.name}`,
    })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ecoleId, selected]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length || !ecoleId || !selected) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${ecoleId}/${selected}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) { toast.error(messageErreurBase(error)); continue; }
    }
    toast.success("Documents téléversés");
    setUploading(false);
    load();
  };

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) return toast.error(messageErreurBase(error) ?? "Erreur");
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Document supprimé");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Label>Enseignant</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {enseignants.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Téléverser un contrat / avenant / pièce RH</Label>
          <Input type="file" multiple accept=".pdf,.jpg,.png,.doc,.docx" disabled={uploading || !selected}
            onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Upload className="h-9 w-9 sm:h-8 sm:w-8 opacity-40" />
          Aucun document. Téléversez le contrat signé, les avenants ou les pièces RH.
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.fullPath} className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(f.size / 1024).toFixed(1)} Ko · {new Date(f.updated_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDownload(f.fullPath)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(f.fullPath)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
