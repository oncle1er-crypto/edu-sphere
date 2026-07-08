import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Clock, FileDown, X, Trash2 } from "lucide-react";
import { useReportQueue, clearFinishedJobs, removeJob } from "@/lib/reportQueue";
import { cn } from "@/lib/utils";

export function ReportQueuePanel() {
  const jobs = useReportQueue();
  const [open, setOpen] = useState(true);

  if (jobs.length === 0) return null;

  const running = jobs.filter((j) => j.status === "running").length;
  const queued = jobs.filter((j) => j.status === "queued").length;
  const done = jobs.filter((j) => j.status === "done").length;
  const errors = jobs.filter((j) => j.status === "error").length;
  const active = running + queued;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-lg border-primary/20">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 border-b"
        >
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">File d'attente rapports</span>
          </div>
          <div className="flex items-center gap-1.5">
            {active > 0 && (
              <Badge variant="secondary" className="h-5 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {active}
              </Badge>
            )}
            {done > 0 && <Badge variant="outline" className="h-5">{done} ✓</Badge>}
            {errors > 0 && <Badge variant="destructive" className="h-5">{errors}</Badge>}
          </div>
        </button>
        {open && (
          <>
            <div className="max-h-72 overflow-y-auto divide-y">
              {jobs.map((j) => (
                <div key={j.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                  <div className="mt-0.5">
                    {j.status === "queued" && <Clock className="h-4 w-4 text-muted-foreground" />}
                    {j.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {j.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {j.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{j.label}</p>
                    <p className={cn("text-xs truncate", j.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                      {j.status === "queued" && "En attente…"}
                      {j.status === "running" && "Génération en cours…"}
                      {j.status === "done" && "Téléchargé"}
                      {j.status === "error" && (j.error ?? "Erreur")}
                    </p>
                  </div>
                  {j.status !== "running" && (
                    <button
                      onClick={() => removeJob(j.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Retirer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(done > 0 || errors > 0) && (
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full h-7 gap-1.5" onClick={clearFinishedJobs}>
                  <Trash2 className="h-3.5 w-3.5" /> Effacer terminés
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
