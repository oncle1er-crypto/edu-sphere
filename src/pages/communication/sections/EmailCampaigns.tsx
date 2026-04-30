import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Mail, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const past = [
  { date: "28/04", sujet: "Rappel paiement scolarité", dest: "Tous parents", envoyes: 412, ouverts: "68%" },
  { date: "25/04", sujet: "Bulletins T2 disponibles", dest: "Parents collège", envoyes: 285, ouverts: "74%" },
  { date: "20/04", sujet: "Réunion pédagogique", dest: "Enseignants", envoyes: 78, ouverts: "92%" },
];

export default function EmailCampaigns() {
  return (
    <SettingsSection
      title="Campagnes email"
      description="Envoyez des emails groupés ciblés."
      icon={<Mail className="h-5 w-5" />}
      hideSave
    >
      <FieldRow label="Destinataires">
        <Select defaultValue="parents">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parents">Tous les parents</SelectItem>
            <SelectItem value="prof">Tous les enseignants</SelectItem>
            <SelectItem value="6a">Parents 6ème A</SelectItem>
            <SelectItem value="custom">Liste personnalisée</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Objet"><Input placeholder="Objet de l'email..." /></FieldRow>
      <FieldRow label="Message">
        <Textarea rows={6} placeholder="Bonjour {{prenom_parent}}, ..." />
      </FieldRow>
      <div className="flex gap-3 border-t pt-4">
        <Button className="gap-2"><Send className="h-4 w-4" /> Envoyer maintenant</Button>
        <Button variant="outline">Programmer</Button>
        <Button variant="ghost">Aperçu</Button>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-bold mb-3 text-sm">Campagnes récentes</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Destinataires</TableHead>
              <TableHead className="text-center">Envoyés</TableHead>
              <TableHead className="text-center">Ouverture</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {past.map((p, i) => (
              <TableRow key={i}>
                <TableCell>{p.date}</TableCell>
                <TableCell className="font-medium">{p.sujet}</TableCell>
                <TableCell>{p.dest}</TableCell>
                <TableCell className="text-center">{p.envoyes}</TableCell>
                <TableCell className="text-center"><Badge variant="default">{p.ouverts}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
