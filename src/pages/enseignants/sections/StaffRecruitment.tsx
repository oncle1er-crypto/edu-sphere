import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Upload } from "lucide-react";

const candidats = [
  { nom: "Bah Ousmane", poste: "Prof Anglais", exp: "5 ans", statut: "Présélectionné" },
  { nom: "Maïga Salif", poste: "Prof Maths", exp: "8 ans", statut: "Entretien" },
  { nom: "Ndiaye Awa", poste: "Surveillante", exp: "2 ans", statut: "Refusé" },
  { nom: "Fofana Bintou", poste: "Prof SVT", exp: "10 ans", statut: "Recruté" },
];

const variantFor = (s: string) =>
  s === "Recruté" ? "default" : s === "Refusé" ? "destructive" : "secondary";

export default function StaffRecruitment() {
  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Recrutement"
      description="Postes ouverts, candidats et processus de sélection."
    >
      <Tabs defaultValue="poste" className="w-full">
        <TabsList>
          <TabsTrigger value="poste">Nouveau poste</TabsTrigger>
          <TabsTrigger value="candidats">Candidats</TabsTrigger>
        </TabsList>

        <TabsContent value="poste" className="space-y-4 mt-4">
          <FieldRow label="Intitulé du poste"><Input placeholder="Professeur de Mathématiques" /></FieldRow>
          <FieldRow label="Type de contrat">
            <Select><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cdi">CDI</SelectItem>
                <SelectItem value="cdd">CDD</SelectItem>
                <SelectItem value="vac">Vacataire</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Diplôme requis"><Input placeholder="Licence / Master" /></FieldRow>
          <FieldRow label="Expérience minimum"><Input placeholder="Ex: 3 ans" /></FieldRow>
          <FieldRow label="Salaire indicatif"><Input placeholder="250 000 FCFA" /></FieldRow>
          <FieldRow label="Date limite candidature"><Input type="date" /></FieldRow>
          <FieldRow label="Description"><Textarea rows={4} /></FieldRow>
        </TabsContent>

        <TabsContent value="candidats" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm"><Upload className="h-4 w-4" />Importer des CV</Button>
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Expérience</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidats.map((c) => (
                  <TableRow key={c.nom}>
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    <TableCell>{c.poste}</TableCell>
                    <TableCell><Badge variant="secondary">{c.exp}</Badge></TableCell>
                    <TableCell><Badge variant={variantFor(c.statut) as any}>{c.statut}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
}
