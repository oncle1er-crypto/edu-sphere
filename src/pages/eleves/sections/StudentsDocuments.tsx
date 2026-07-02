import { useState, useRef } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Files, FileText, Image as ImageIcon, FileBadge, ScrollText,
  Search, Loader2, Upload, Download, Trash2, Eye, CheckCircle2,
} from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useDocumentsEleves, DocumentEleve } from "@/hooks/useDocumentsEleves";
import { useExigencesDocuments } from "@/hooks/useExigencesDocuments";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ExigencesTemplatesPanel from "../components/ExigencesTemplatesPanel";

const DOC_TYPES = [
  { key: "acte_naissance", label: "Acte de naissance", icon: FileText },
  { key: "photo_identite", label: "Photo d'identité", icon: ImageIcon },
  { key: "bulletin", label: "Bulletin scolaire", icon: ScrollText },
  { key: "certificat_scolarite", label: "Certificat de scolarité", icon: FileBadge },
  { key: "carnet_vaccination", label: "Carnet de vaccination", icon: FileText },
  { key: "carte_tuteur", label: "Carte d'identité tuteur", icon: FileBadge },
];

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function StudentsDocuments() {
  const { eleves, loading: loadingEleves } = useEleves(activeAnnee.id);
  const { user } = useAuth();
  const [selectedEleve, setSelectedEleve] = useState("");
  const [q, setQ] = useState("");
  const [uploadType, setUploadType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentEleve | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, loading: loadingDocs, uploadDocument, deleteDocument, downloadDocument } =
    useDocumentsEleves(selectedEleve || undefined);
  const { setObligatoire, isObligatoire } = useExigencesDocuments(selectedEleve || undefined);

  const filteredEleves = eleves.filter(
    (e) =>
      e.nom.toLowerCase().includes(q.toLowerCase()) ||
      e.prenom.toLowerCase().includes(q.toLowerCase()) ||
      e.matricule.toLowerCase().includes(q.toLowerCase())
  );

  const eleve = eleves.find((e) => e.id === selectedEleve);

  const getDocForType = (type: string): DocumentEleve | undefined =>
    documents.find((d) => d.type_document === type);

  const handleUploadClick = (type: string) => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType || !selectedEleve) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }

    setUploading(true);
    await uploadDocument(selectedEleve, uploadType, file, user?.id);
    setUploading(false);
    setUploadType(null);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (doc: DocumentEleve) => {
    if (!confirm(`Supprimer le document "${doc.nom_fichier}" ?`)) return;
    await deleteDocument(doc);
  };

  const handlePreview = async (doc: DocumentEleve) => {
    // For images, we can show inline preview
    if (doc.mime_type?.startsWith("image/")) {
      const { data } = await (await import("@/integrations/supabase/client")).supabase.storage
        .from("documents-eleves")
        .createSignedUrl(doc.chemin_stockage, 300);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewDoc(doc);
      }
    } else {
      // For PDF/other, just download
      downloadDocument(doc);
    }
  };

  if (loadingEleves) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<Files className="h-5 w-5" />}
      title="Documents & dossiers scolaires"
      description="Téléversez et gérez les pièces justificatives de chaque élève."
      hideSave
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        onChange={handleFileChange}
      />

      {/* Templates panel */}
      <ExigencesTemplatesPanel docTypes={DOC_TYPES} />

      {/* Student selector */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <SearchableSelect
          value={selectedEleve}
          onValueChange={setSelectedEleve}
          placeholder="Sélectionner un élève"
          searchPlaceholder="Rechercher un élève..."
          className="w-full sm:w-72"
          fullWidth={false}
          options={filteredEleves.slice(0, 200).map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom} — ${e.matricule}`, keywords: `${e.classe_nom ?? ""}` }))}
        />
      </div>

      {eleve ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div>
              <h3 className="font-bold">
                {eleve.nom} {eleve.prenom}
              </h3>
              <p className="text-xs text-muted-foreground">
                {eleve.matricule} • {eleve.classe_nom ?? "Non affecté"}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary">
                {documents.length}/{DOC_TYPES.length} documents
              </Badge>
            </div>
          </div>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DOC_TYPES.map((d) => {
                const doc = getDocForType(d.key);
                const isUploaded = !!doc;
                const obligatoire = isObligatoire(d.key);
                return (
                  <Card
                    key={d.key}
                    className={`border ${isUploaded ? "border-emerald-200 bg-emerald-50/30" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isUploaded
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-accent/15 text-primary"
                          }`}
                        >
                          {isUploaded ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <d.icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{d.label}</p>
                            <Badge
                              variant={obligatoire ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {obligatoire ? "Obligatoire" : "Optionnel"}
                            </Badge>
                          </div>
                          {isUploaded ? (
                            <div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {doc.nom_fichier}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatFileSize(doc.taille)} •{" "}
                                {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Non téléversé</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pl-12">
                        <Switch
                          checked={obligatoire}
                          onCheckedChange={(v) => setObligatoire(d.key, v)}
                          aria-label="Obligatoire"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          Exiger ce document pour cet élève
                        </span>
                      </div>
                      <div className="flex gap-1 mt-3">
                        {isUploaded ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handlePreview(doc)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => downloadDocument(doc)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs ml-auto"
                              onClick={() => handleUploadClick(d.key)}
                              disabled={uploading}
                            >
                              {uploading && uploadType === d.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              Remplacer
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs w-full"
                            onClick={() => handleUploadClick(d.key)}
                            disabled={uploading}
                          >
                            {uploading && uploadType === d.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            Téléverser
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Progression */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${(documents.length / DOC_TYPES.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {Math.round((documents.length / DOC_TYPES.length) * 100)}% complet
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Files className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un élève pour consulter son dossier.</p>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => { setPreviewDoc(null); setPreviewUrl(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDoc?.nom_fichier}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={previewDoc?.nom_fichier}
              className="w-full rounded-lg max-h-[60vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
