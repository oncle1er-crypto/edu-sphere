import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export interface DocumentEleve {
  id: string;
  ecole_id: string;
  eleve_id: string;
  type_document: string;
  nom_fichier: string;
  chemin_stockage: string;
  taille: number | null;
  mime_type: string | null;
  uploade_par: string | null;
  created_at: string;
}

export function useDocumentsEleves(eleveId?: string) {
  const ecoleId = useEcoleId();
  const [documents, setDocuments] = useState<DocumentEleve[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!ecoleId || !eleveId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents_eleves")
      .select("*")
      .eq("ecole_id", ecoleId)
      .eq("eleve_id", eleveId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching documents:", error);
    } else {
      setDocuments((data as any[]) ?? []);
    }
    setLoading(false);
  }, [ecoleId, eleveId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    eleveId: string,
    typeDocument: string,
    file: File,
    userId?: string
  ) => {
    if (!ecoleId) return null;
    const ext = file.name.split(".").pop();
    const path = `${ecoleId}/${eleveId}/${typeDocument}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents-eleves")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors du téléversement : " + uploadError.message);
      return null;
    }

    const { data, error: insertError } = await supabase
      .from("documents_eleves")
      .insert({
        ecole_id: ecoleId,
        eleve_id: eleveId,
        type_document: typeDocument,
        nom_fichier: file.name,
        chemin_stockage: path,
        taille: file.size,
        mime_type: file.type,
        uploade_par: userId ?? null,
      } as any)
      .select()
      .single();

    if (insertError) {
      toast.error("Erreur métadonnées : " + insertError.message);
      return null;
    }

    toast.success("Document téléversé avec succès");
    await fetchDocuments();
    return data;
  };

  const deleteDocument = async (doc: DocumentEleve) => {
    const { error: storageError } = await supabase.storage
      .from("documents-eleves")
      .remove([doc.chemin_stockage]);

    if (storageError) {
      toast.error("Erreur suppression fichier : " + storageError.message);
      return false;
    }

    const { error: dbError } = await supabase
      .from("documents_eleves")
      .delete()
      .eq("id", doc.id);

    if (dbError) {
      toast.error("Erreur suppression métadonnées : " + dbError.message);
      return false;
    }

    toast.success("Document supprimé");
    await fetchDocuments();
    return true;
  };

  const downloadDocument = async (doc: DocumentEleve) => {
    const { data, error } = await supabase.storage
      .from("documents-eleves")
      .download(doc.chemin_stockage);

    if (error) {
      toast.error("Erreur téléchargement : " + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nom_fichier;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { documents, loading, uploadDocument, deleteDocument, downloadDocument, ecoleId };
}
