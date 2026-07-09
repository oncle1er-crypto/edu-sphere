import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Par où commencer pour configurer l'école ?",
  "Comment inscrire un nouvel élève de A à Z ?",
  "Comment générer les bulletins de notes ?",
  "Comment envoyer une relance SMS aux parents ?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "👋 Bonjour ! Je suis **Providence Assistant**, votre guide pour le logiciel de gestion du COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE.\n\nJe peux vous expliquer **pas à pas** chaque module, vous indiquer le chemin exact dans l'application et vous accompagner dans toutes les configurations.\n\n👉 Posez-moi votre question, ou choisissez un sujet ci-dessous.",
};

export function AIAssistant() {
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!isAdmin) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expirée, reconnectez-vous.");
        setLoading(false);
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: next.filter((m) => m !== WELCOME).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) {
        toast.error("Trop de requêtes, patientez un instant.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés. Rechargez votre espace.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Erreur serveur");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(j);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Une erreur est survenue. Réessayez.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] flex items-center justify-center transition-all hover:scale-105",
          open && "scale-90 opacity-0 pointer-events-none",
        )}
        aria-label="Ouvrir l'assistant IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Panneau */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-[60] w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] rounded-2xl bg-card border shadow-[var(--shadow-elegant)] flex flex-col overflow-hidden transition-all origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold font-display">Providence Assistant</div>
            <div className="text-xs opacity-80">Votre guide pas à pas</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
              <div
                className={cn(
                  "h-9 w-9 sm:h-7 sm:w-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs",
                  m.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-strong:text-foreground",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground prose-invert"
                    : "bg-card border",
                )}
              >
                <ReactMarkdown
                  components={{
                    a: ({ href, children, ...props }) => {
                      const isInternal = !!href && href.startsWith("/");
                      return (
                        <a
                          href={href}
                          {...props}
                          onClick={(e) => {
                            if (isInternal) {
                              e.preventDefault();
                              navigate(href!);
                              setOpen(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                          target={isInternal ? undefined : "_blank"}
                          rel={isInternal ? undefined : "noreferrer"}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {m.content || "…"}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2">
              <div className="h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-card border text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {messages.length <= 1 && !loading && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Suggestions
              </div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-card border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-card">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Posez votre question..."
              rows={1}
              className="resize-none min-h-[40px] max-h-32"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Réservé aux administrateurs · Propulsé par Lovable AI
          </div>
        </div>
      </div>
    </>
  );
}
