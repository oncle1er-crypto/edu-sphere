import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Files, Download, FileText, Image as ImageIcon, FileBadge, ScrollText } from "lucide-react";

const docs = [
  { titre: "Acte de naissance", icon: FileText, taille: "245 Ko", date: "12/09/2025" },
  { titre: "Photo d'identité", icon: ImageIcon, taille: "1,2 Mo", date: "12/09/2025" },
  { titre: "Bulletin 2024-2025", icon: ScrollText, taille: "180 Ko", date: "30/06/2025" },
  { titre: "Certificat de scolarité", icon: FileBadge, taille: "98 Ko", date: "15/09/2025" },
  { titre: "Carnet de vaccination", icon: FileText, taille: "320 Ko", date: "12/09/2025" },
  { titre: "Carte d'identité tuteur", icon: FileBadge, taille: "210 Ko", date: "12/09/2025" },
];

export default function StudentsDocuments() {
  return (
    <SettingsSection
      icon={<Files className="h-5 w-5" />}
      title="Documents & dossiers scolaires"
      description="Pièces justificatives et documents officiels par élève."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {docs.map((d) => (
          <Card key={d.titre} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <d.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.titre}</p>
                <p className="text-[11px] text-muted-foreground">{d.taille} • {d.date}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
