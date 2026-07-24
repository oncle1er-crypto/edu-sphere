import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SpCandidat } from "../hooks/useSpCandidats";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidat: SpCandidat | null;
  onSubmit: (notes: {
    note_francais: number | null;
    note_maths: number | null;
    note_anglais: number | null;
  }) => Promise<void> | void;
}

const parse = (s: string): number | null => {
  if (s === "" || s == null) return null;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function isSixiemeOuCinquieme(classe: string | null | undefined): boolean {
  if (!classe) return false;
  return /^\s*(6|5)\s*[eèé]?me?\b/i.test(classe);
}

export function CandidatNotesDialog({ open, onOpenChange, candidat, onSubmit }: Props) {
  const [fr, setFr] = useState("");
  const [ma, setMa] = useState("");
  const [an, setAn] = useState("");
  const [saving, setSaving] = useState(false);

  const need3 = !isSixiemeOuCinquieme(candidat?.classe_demandee);

  useEffect(() => {
    if (!candidat) return;
    setFr(candidat.note_francais != null ? String(candidat.note_francais).replace(".", ",") : "");
    setMa(candidat.note_maths != null ? String(candidat.note_maths).replace(".", ",") : "");
    setAn(candidat.note_anglais != null ? String(candidat.note_anglais).replace(".", ",") : "");
  }, [candidat]);

  const { moyenne, statut } = useMemo(() => {
    const f = parse(fr), m = parse(ma), a = parse(an);
    let moy: number | null = null;
    if (need3) {
      if (f != null && m != null && a != null) moy = Math.round(((f + m + a) / 3) * 100) / 100;
    } else {
      if (f != null && m != null) moy = Math.round(((f + m) / 2) * 100) / 100;
    }
    const st = moy == null ? "—" : moy >= 10 ? "Admis" : "Refusé";
    return { moyenne: moy, statut: st };
  }, [fr, ma, an, need3]);

  const validRange = (s: string) => {
    if (s === "") return true;
    const n = parse(s);
    return n != null && n >= 0 && n <= 20;
  };
  const canSave = validRange(fr) && validRange(ma) && (need3 ? validRange(an) : true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit({
        note_francais: parse(fr),
        note_maths: parse(ma),
        note_anglais: need3 ? parse(an) : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Saisie des notes — {candidat?.nom} {candidat?.prenom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs text-muted-foreground">
            Classe demandée : <span className="font-medium">{candidat?.classe_demandee ?? "—"}</span>
            <br />
            {need3
              ? "Épreuves : Français, Mathématiques, Anglais (moyenne sur 3)"
              : "Épreuves : Français, Mathématiques (moyenne sur 2)"}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Français /20</Label>
              <Input
                inputMode="decimal"
                value={fr}
                onChange={(e) => setFr(e.target.value)}
                placeholder="ex : 12,5"
              />
            </div>
            <div>
              <Label>Mathématiques /20</Label>
              <Input
                inputMode="decimal"
                value={ma}
                onChange={(e) => setMa(e.target.value)}
                placeholder="ex : 14"
              />
            </div>
            {need3 && (
              <div className="col-span-2">
                <Label>Anglais /20</Label>
                <Input
                  inputMode="decimal"
                  value={an}
                  onChange={(e) => setAn(e.target.value)}
                  placeholder="ex : 11"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/40">
            <div>
              <div className="text-xs text-muted-foreground">Moyenne calculée</div>
              <div className="text-2xl font-bold tabular-nums">
                {moyenne != null ? moyenne.toFixed(2).replace(".", ",") : "—"}
                <span className="text-sm text-muted-foreground"> /20</span>
              </div>
            </div>
            <Badge
              className={
                statut === "Admis"
                  ? "bg-emerald-700 text-white"
                  : statut === "Refusé"
                  ? "bg-destructive text-white"
                  : "bg-muted"
              }
            >
              {statut}
            </Badge>
          </div>

          {!canSave && (
            <p className="text-xs text-destructive">Chaque note doit être comprise entre 0 et 20.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
