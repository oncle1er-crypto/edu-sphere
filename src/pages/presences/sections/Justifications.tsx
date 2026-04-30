import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Check, X } from "lucide-react";

const items = [
  { eleve: "Awa Diallo", classe: "6ème A", motif: "Certificat médical", piece: "certif_medical.pdf", date: "2026-04-29" },
  { eleve: "Ibrahima Bah", classe: "Terminale S", motif: "Décès dans la famille", piece: "lettre_parents.pdf", date: "2026-04-28" },
  { eleve: "Mariama Cissé", classe: "4ème C", motif: "Convocation administrative", piece: "convocation.jpg", date: "2026-04-27" },
];

export default function Justifications() {
  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Justificatifs en attente"
      description="Validation des pièces fournies par les familles."
    >
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{it.eleve}</p>
                <Badge variant="outline">{it.classe}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{it.motif}</p>
              <p className="text-xs text-muted-foreground">📎 {it.piece} · reçu le {it.date}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline"><X className="h-4 w-4" /> Refuser</Button>
              <Button size="sm"><Check className="h-4 w-4" /> Valider</Button>
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
