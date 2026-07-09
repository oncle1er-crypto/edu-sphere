import { SettingsSection } from "@/components/settings/SettingsSection";
import { Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const medias = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  name: `media_${(i + 1).toString().padStart(2, "0")}.jpg`,
  size: `${(Math.random() * 2 + 0.3).toFixed(1)} Mo`,
}));

export default function MediaLibrary() {
  return (
    <SettingsSection
      title="Bibliothèque média"
      description="Images, logos et pièces jointes utilisées dans les communications."
      icon={<ImageIcon className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Upload className="h-4 w-4" /> Téléverser</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {medias.map((m) => (
          <Card key={m.id} className="border shadow-[var(--shadow-card)] overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <ImageIcon className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground/40" />
            </div>
            <CardContent className="p-2">
              <p className="text-xs font-medium truncate">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">{m.size}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
