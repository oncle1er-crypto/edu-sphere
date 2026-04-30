import { SettingsSection } from "@/components/settings/SettingsSection";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const conversations = [
  { name: "Mme Sow", last: "Merci beaucoup !", time: "12:32", unread: 0 },
  { name: "M. Diop", last: "On valide pour vendredi.", time: "11:08", unread: 2 },
  { name: "Direction", last: "Réunion confirmée.", time: "Hier", unread: 0 },
  { name: "Mme Ndiaye", last: "Parfait, à demain.", time: "Hier", unread: 0 },
];

export default function DirectMessages() {
  return (
    <SettingsSection
      title="Messages directs"
      description="Discussions privées avec parents et enseignants."
      icon={<MessageSquare className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-[260px_1fr] gap-4 h-[480px]">
        <div className="border rounded-lg overflow-y-auto divide-y">
          {conversations.map((c, i) => (
            <div key={i} className={`p-3 cursor-pointer hover:bg-muted/50 ${i === 0 ? "bg-muted" : ""}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm">{c.name}</span>
                <span className="text-[10px] text-muted-foreground">{c.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground truncate">{c.last}</p>
                {c.unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 ml-1">{c.unread}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border rounded-lg flex flex-col">
          <div className="p-3 border-b font-semibold text-sm">Mme Sow</div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-muted/20">
            <div className="flex justify-start">
              <div className="bg-card border rounded-lg px-3 py-2 max-w-[80%] text-sm">Bonjour, je voudrais un RDV avec le prof principal.</div>
            </div>
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%] text-sm">Bonjour, je vous propose mardi à 17h.</div>
            </div>
            <div className="flex justify-start">
              <div className="bg-card border rounded-lg px-3 py-2 max-w-[80%] text-sm">Merci beaucoup !</div>
            </div>
          </div>
          <div className="p-3 border-t flex gap-2">
            <Input placeholder="Écrire un message..." className="flex-1" />
            <Button size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="hidden">
        <Textarea />
      </div>
    </SettingsSection>
  );
}
