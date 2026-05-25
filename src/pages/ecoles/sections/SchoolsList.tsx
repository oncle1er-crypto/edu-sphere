import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { School, Search, Pause, Play, Trash2, CheckCircle2, MapPin, Building2 } from "lucide-react";
import { useEcoles, type EcoleStatus } from "@/context/EcoleContext";
import { toast } from "sonner";

const statusConfig: Record<EcoleStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-accent/15 text-primary border-accent/30" },
  suspendue: { label: "Suspendue", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  archivee: { label: "Archivée", cls: "bg-muted text-muted-foreground border-border" },
};

export default function SchoolsList() {
  const { ecoles, setStatus, removeEcole, setCurrentEcoleId, currentEcoleId } = useEcoles();
  const [q, setQ] = useState("");

  const filtered = ecoles.filter(
    (e) =>
      e.nom.toLowerCase().includes(q.toLowerCase()) ||
      e.code.toLowerCase().includes(q.toLowerCase()) ||
      e.ville.toLowerCase().includes(q.toLowerCase()),
  );

  const handleToggle = (id: string, current: EcoleStatus) => {
    const next: EcoleStatus = current === "active" ? "suspendue" : "active";
    setStatus(id, next);
    toast.success(next === "active" ? "École activée" : "École suspendue");
  };

  return (
    <SettingsSection
      title="Liste des écoles"
      description="Activer, suspendre ou supprimer un établissement du réseau."
      icon={<School className="h-5 w-5" />}
      hideSave
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, code ou ville…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filtered.length} école(s)</Badge>
      </div>

      <div className="grid gap-3">
        {filtered.map((e) => {
          const isCurrent = e.ecole_id === currentEcoleId;
          return (
            <Card key={e.ecole_id} className="border shadow-[var(--shadow-card)]">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{e.nom}</h3>
                      <Badge variant="outline" className={statusConfig[e.status].cls}>
                        {statusConfig[e.status].label}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          Tenant actif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {e.ville}, {e.pays} • {e.code} • {e.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{e.effectif_eleves}</span> élèves •{" "}
                      <span className="font-medium">{e.effectif_enseignants}</span> enseignants •{" "}
                      <span className="font-medium">{e.nb_classes}</span> classes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!isCurrent && (
                    <Button size="sm" variant="outline" onClick={() => { setCurrentEcoleId(e.ecole_id); toast.success(`Tenant actif : ${e.nom}`); }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Activer comme tenant
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={e.status === "active" ? "outline" : "default"}
                    onClick={() => handleToggle(e.ecole_id, e.status)}
                  >
                    {e.status === "active" ? (<><Pause className="h-4 w-4 mr-1" /> Suspendre</>) : (<><Play className="h-4 w-4 mr-1" /> Activer</>)}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Supprimer ${e.nom} ? Cette action est irréversible.`)) {
                        removeEcole(e.ecole_id);
                        toast.success("École supprimée");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune école ne correspond à la recherche.</p>
        )}
      </div>
    </SettingsSection>
  );
}
