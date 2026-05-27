import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, FileCheck, ShieldAlert, Heart, ClipboardCheck, Users } from "lucide-react";
import { useBilletsSortie, useCertificatsAbsence } from "@/hooks/useVieScolaire";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function VieScolaireDashboard() {
  const { items: billets } = useBilletsSortie();
  const { items: certifs } = useCertificatsAbsence();

  const today = new Date().toISOString().slice(0, 10);
  const billetsToday = billets.filter(b => b.date_sortie === today).length;
  const billetsEnCours = billets.filter(b => b.statut === "emis").length;
  const certifs30j = certifs.filter(c => {
    const d = new Date(c.date_debut);
    return (Date.now() - d.getTime()) < 30 * 24 * 3600 * 1000;
  }).length;

  const kpis = [
    { label: "Billets émis aujourd'hui", value: billetsToday, icon: LogOut, color: "text-primary" },
    { label: "Sorties en cours", value: billetsEnCours, icon: Users, color: "text-amber-600" },
    { label: "Certificats d'absence (30j)", value: certifs30j, icon: FileCheck, color: "text-emerald-600" },
    { label: "Total certificats", value: certifs.length, icon: FileCheck, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="text-3xl font-bold mt-2">{k.value}</p>
                </div>
                <k.icon className={`h-8 w-8 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Actions rapides</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/vie-scolaire/billets"><LogOut className="h-4 w-4 mr-2" />Délivrer un billet de sortie</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/vie-scolaire/certificats"><FileCheck className="h-4 w-4 mr-2" />Délivrer un certificat d'absence</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Modules supervisés</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="ghost">
              <Link to="/presences"><ClipboardCheck className="h-4 w-4 mr-2" />Présences élèves & personnel</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="ghost">
              <Link to="/eleves/discipline"><ShieldAlert className="h-4 w-4 mr-2" />Discipline & sanctions</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="ghost">
              <Link to="/eleves/sante"><Heart className="h-4 w-4 mr-2" />Santé & infirmerie</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
