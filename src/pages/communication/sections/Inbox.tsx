import { SettingsSection } from "@/components/settings/SettingsSection";
import { Inbox, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const inbox = [
  { from: "Mme Sow (Parent)", subject: "Demande de rendez-vous", preview: "Bonjour, je souhaiterais rencontrer le professeur principal...", date: "il y a 12 min", unread: true },
  { from: "M. Diop (Prof. Maths)", subject: "Note de service", preview: "Réunion pédagogique vendredi à 16h en salle des profs.", date: "il y a 1 h", unread: true },
  { from: "Direction", subject: "Bulletin trimestriel disponible", preview: "Les bulletins du T2 sont prêts à être consultés...", date: "il y a 3 h", unread: false },
  { from: "Mme Ndiaye (Parent)", subject: "Justificatif d'absence", preview: "Veuillez trouver ci-joint le certificat médical de ma fille...", date: "Hier", unread: false },
  { from: "Service comptable", subject: "Confirmation paiement", preview: "Reçu n°FAC-2026-0421 confirmé pour Diallo A.", date: "Hier", unread: false },
];

export default function Inbox_() {
  return (
    <SettingsSection
      title="Boîte de réception"
      description="Messages reçus, classés du plus récent au plus ancien."
      icon={<Inbox className="h-5 w-5" />}
      hideSave
    >
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher dans les messages..." className="pl-9" />
      </div>
      <div className="border rounded-lg divide-y">
        {inbox.map((m, i) => (
          <div key={i} className={`p-4 hover:bg-muted/50 cursor-pointer ${m.unread ? "bg-accent/5" : ""}`}>
            <div className="flex items-start gap-3">
              <Mail className={`h-4 w-4 mt-1 shrink-0 ${m.unread ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-sm ${m.unread ? "font-bold" : "font-medium"}`}>{m.from}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{m.date}</span>
                </div>
                <div className="text-sm font-medium mb-0.5">{m.subject}</div>
                <p className="text-xs text-muted-foreground truncate">{m.preview}</p>
              </div>
              {m.unread && <Badge variant="default" className="text-[10px]">Nouveau</Badge>}
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
