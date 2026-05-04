import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  User, CalendarCheck, Wallet, Award, Files, Loader2,
  Check, X, Clock, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  eleve: any | null;
  open: boolean;
  onClose: () => void;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function StudentDetailDrawer({ eleve, open, onClose }: Props) {
  const [presences, setPresences] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eleve || !open) return;
    setLoading(true);
    const id = eleve.id;
    const ecoleId = eleve.ecole_id;

    Promise.all([
      supabase
        .from("presences")
        .select("*")
        .eq("eleve_id", id)
        .order("date_presence", { ascending: false })
        .limit(30),
      supabase
        .from("paiements")
        .select("*")
        .eq("eleve_id", id)
        .eq("ecole_id", ecoleId)
        .order("date_paiement", { ascending: false })
        .limit(20),
      supabase
        .from("incidents_discipline")
        .select("*")
        .eq("eleve_id", id)
        .order("date_incident", { ascending: false })
        .limit(20),
      supabase
        .from("documents_eleves")
        .select("*")
        .eq("eleve_id", id)
        .eq("ecole_id", ecoleId),
      supabase
        .from("eleve_parents")
        .select("*, parents:parent_id(nom, prenom, telephone, email)")
        .eq("eleve_id", id),
    ]).then(([presR, paiR, incR, docR, parR]) => {
      setPresences((presR.data as any[]) ?? []);
      setPaiements((paiR.data as any[]) ?? []);
      setIncidents((incR.data as any[]) ?? []);
      setDocuments((docR.data as any[]) ?? []);
      setParents((parR.data as any[]) ?? []);
      setLoading(false);
    });
  }, [eleve, open]);

  if (!eleve) return null;

  const init = `${(eleve.prenom?.[0] ?? "")}${(eleve.nom?.[0] ?? "")}`.toUpperCase();

  // Attendance stats
  const totalPres = presences.length;
  const nbPresent = presences.filter((p) => p.statut === "present").length;
  const nbAbsent = presences.filter((p) => p.statut === "absent").length;
  const nbRetard = presences.filter((p) => p.statut === "retard").length;
  const tauxPresence = totalPres > 0 ? Math.round((nbPresent / totalPres) * 100) : 0;

  // Finance stats
  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0);

  const typeLabels: Record<string, string> = {
    avertissement: "Avertissement", sanction: "Sanction", exclusion: "Exclusion",
    felicitation: "Félicitation", encouragement: "Encouragement",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {init}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">
                {eleve.prenom} {eleve.nom}
              </SheetTitle>
              <p className="text-sm text-muted-foreground font-mono">{eleve.matricule}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary">{eleve.classe_nom ?? "Non affecté"}</Badge>
                <Badge>{eleve.statut}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="identite" className="mt-2">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="identite" className="text-xs"><User className="h-3.5 w-3.5 mr-1" />Identité</TabsTrigger>
              <TabsTrigger value="presences" className="text-xs"><CalendarCheck className="h-3.5 w-3.5 mr-1" />Présences</TabsTrigger>
              <TabsTrigger value="finances" className="text-xs"><Wallet className="h-3.5 w-3.5 mr-1" />Finances</TabsTrigger>
              <TabsTrigger value="discipline" className="text-xs"><Award className="h-3.5 w-3.5 mr-1" />Discipline</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs"><Files className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
            </TabsList>

            {/* IDENTITÉ */}
            <TabsContent value="identite" className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Sexe" value={eleve.sexe === "F" ? "Féminin" : eleve.sexe === "M" ? "Masculin" : "—"} />
                <Info label="Né(e) le" value={fmt(eleve.date_naissance)} />
                <Info label="Lieu de naissance" value={eleve.lieu_naissance} />
                <Info label="Nationalité" value={eleve.nationalite} />
                <Info label="Classe" value={eleve.classe_nom ?? "Non affecté"} />
                <Info label="Cycle" value={eleve.cycle_nom} />
                <Info label="Date inscription" value={fmt(eleve.date_inscription)} />
                {eleve.adresse && <Info label="Adresse" value={eleve.adresse} span2 />}
              </div>

              {parents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Parent(s) / Tuteur(s)
                  </h4>
                  {parents.map((p, i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-3 text-sm">
                        <p className="font-medium">
                          {(p as any).parents?.prenom} {(p as any).parents?.nom} ({p.lien})
                        </p>
                        <p className="text-muted-foreground">
                          {(p as any).parents?.telephone ?? "—"} • {(p as any).parents?.email ?? "—"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PRÉSENCES */}
            <TabsContent value="presences" className="space-y-4 mt-3">
              <div className="grid grid-cols-3 gap-3">
                <StatMini icon={Check} label="Présent" value={nbPresent} color="text-emerald-600" />
                <StatMini icon={X} label="Absent" value={nbAbsent} color="text-destructive" />
                <StatMini icon={Clock} label="Retard" value={nbRetard} color="text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taux de présence</span>
                  <span>{tauxPresence}%</span>
                </div>
                <Progress value={tauxPresence} className="h-2" />
              </div>
              {presences.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presences.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{fmt(p.date_presence)}</TableCell>
                          <TableCell>
                            <Badge variant={p.statut === "present" ? "default" : p.statut === "absent" ? "destructive" : "secondary"}>
                              {p.statut}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty text="Aucune donnée de présence" />
              )}
            </TabsContent>

            {/* FINANCES */}
            <TabsContent value="finances" className="space-y-4 mt-3">
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-2xl font-extrabold font-display">
                      {totalPaye.toLocaleString("fr-FR")} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">Total payé ({paiements.length} paiements)</p>
                  </div>
                </CardContent>
              </Card>
              {paiements.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Réf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paiements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{fmt(p.date_paiement)}</TableCell>
                          <TableCell className="font-semibold">{Number(p.montant).toLocaleString("fr-FR")} F</TableCell>
                          <TableCell><Badge variant="secondary">{p.mode}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty text="Aucun paiement enregistré" />
              )}
            </TabsContent>

            {/* DISCIPLINE */}
            <TabsContent value="discipline" className="space-y-4 mt-3">
              {incidents.length > 0 ? (
                <div className="space-y-2">
                  {incidents.map((inc) => (
                    <Card key={inc.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={inc.gravite === "grave" ? "destructive" : "secondary"}>
                            {typeLabels[inc.type] ?? inc.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmt(inc.date_incident)}</span>
                        </div>
                        <p className="text-sm">{inc.motif}</p>
                        {inc.decision && (
                          <p className="text-xs text-muted-foreground mt-1">Décision : {inc.decision}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun incident disciplinaire" />
              )}
            </TabsContent>

            {/* DOCUMENTS */}
            <TabsContent value="documents" className="space-y-4 mt-3">
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.nom_fichier}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.type_document} • {fmt(doc.created_at)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {doc.mime_type?.split("/")[1] ?? "fichier"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun document téléversé" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <span className="text-muted-foreground">{label} :</span>{" "}
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border">
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-lg font-extrabold font-display">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">{text}</div>
  );
}
