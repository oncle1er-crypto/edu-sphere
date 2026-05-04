import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Files, FileText, Image as ImageIcon, FileBadge, ScrollText, Search, Loader2, Upload } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";

const DOC_TYPES = [
  { key: "acte_naissance", label: "Acte de naissance", icon: FileText },
  { key: "photo_identite", label: "Photo d'identité", icon: ImageIcon },
  { key: "bulletin", label: "Bulletin scolaire", icon: ScrollText },
  { key: "certificat_scolarite", label: "Certificat de scolarité", icon: FileBadge },
  { key: "carnet_vaccination", label: "Carnet de vaccination", icon: FileText },
  { key: "carte_tuteur", label: "Carte d'identité tuteur", icon: FileBadge },
];

export default function StudentsDocuments() {
  const { eleves, loading } = useEleves();
  const [selectedEleve, setSelectedEleve] = useState("");
  const [q, setQ] = useState("");

  const filteredEleves = eleves.filter(
    (e) =>
      e.nom.toLowerCase().includes(q.toLowerCase()) ||
      e.prenom.toLowerCase().includes(q.toLowerCase()) ||
      e.matricule.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const eleve = eleves.find((e) => e.id === selectedEleve);

  return (
    <SettingsSection
      icon={<Files className="h-5 w-5" />}
      title="Documents & dossiers scolaires"
      description="Pièces justificatives et documents officiels par élève."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un élève..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={selectedEleve} onValueChange={setSelectedEleve}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
          <SelectContent>
            {filteredEleves.slice(0, 50).map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.matricule}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {eleve ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div>
              <h3 className="font-bold">{eleve.prenom} {eleve.nom}</h3>
              <p className="text-xs text-muted-foreground">{eleve.matricule} • {eleve.classe_nom ?? "Non affecté"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOC_TYPES.map((d) => (
              <Card key={d.key} className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">Non téléversé</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Manquant</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Le stockage de fichiers sera activé prochainement pour téléverser les documents.
          </p>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Files className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un élève pour consulter son dossier.</p>
        </div>
      )}
    </SettingsSection>
  );
}
