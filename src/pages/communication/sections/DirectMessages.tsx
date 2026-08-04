import { SettingsSection } from "@/components/settings/SettingsSection";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Message { id: string; sujet: string; contenu: string | null; expediteur_id: string; destinataire_id: string | null; created_at: string; lu: boolean; }

export default function DirectMessages() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState({ sujet: "", contenu: "" });

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("messages").select("*").or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(50);
    if (data) setMessages(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (!ecoleLoading && user) fetch(); if (!ecoleLoading && !user) setLoading(false); }, [ecoleLoading, user, fetch]);

  const handleSend = async () => {
    if (!ecoleId || !user || !newMsg.sujet) return;
    const { error } = await supabase.from("messages").insert({ ecole_id: ecoleId, sujet: newMsg.sujet, contenu: newMsg.contenu, expediteur_id: user.id });
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Message envoyé");
    setNewMsg({ sujet: "", contenu: "" });
    fetch();
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Messages (${messages.length})`} description="Discussions internes." icon={<MessageSquare className="h-5 w-5" />} hideSave>
      <div className="border rounded-lg p-4 space-y-3">
        <Input placeholder="Sujet..." value={newMsg.sujet} onChange={(e) => setNewMsg({ ...newMsg, sujet: e.target.value })} />
        <div className="flex gap-2">
          <Input placeholder="Écrire un message..." className="flex-1" value={newMsg.contenu} onChange={(e) => setNewMsg({ ...newMsg, contenu: e.target.value })} />
          <Button size="icon" onClick={handleSend}><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="p-3">
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-sm">{m.sujet}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="text-xs text-muted-foreground">{m.contenu ?? "—"}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun message.</p>}
      </div>
    </SettingsSection>
  );
}
