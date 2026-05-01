import { QRCodeSVG } from "qrcode.react";
import { GraduationCap, IdCard, UtensilsCrossed, Bus, Library, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type CardType = "eleve" | "personnel" | "cantine" | "transport" | "bibliotheque" | "visiteur";

export interface CardData {
  type: CardType;
  ecoleNom: string;
  ecoleVille?: string;
  ecoleLogo?: string;     // URL/dataURL
  ecoleId: string;
  // Identité
  nom: string;
  prenom: string;
  matricule: string;
  photo?: string;         // URL/dataURL
  // Spécifiques
  classe?: string;        // Élève
  fonction?: string;      // Personnel
  formule?: string;       // Cantine
  ligne?: string;         // Transport
  arret?: string;         // Transport
  numLecteur?: string;    // Bibliothèque
  motif?: string;         // Visiteur
  hote?: string;          // Visiteur
  // Validité
  anneeScolaire: string;
  validJusqu: string;     // ISO
  // Couleurs (depuis branding école)
  couleurPrimaire?: string;  // hex
  couleurAccent?: string;    // hex
}

const TYPE_META: Record<CardType, { label: string; short: string; icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  eleve:        { label: "CARTE SCOLAIRE",     short: "Élève",        icon: GraduationCap, gradient: "from-primary to-primary/70" },
  personnel:    { label: "BADGE PERSONNEL",    short: "Personnel",    icon: Users,         gradient: "from-slate-700 to-slate-900" },
  cantine:      { label: "CARTE CANTINE",      short: "Cantine",      icon: UtensilsCrossed, gradient: "from-amber-500 to-orange-600" },
  transport:    { label: "CARTE TRANSPORT",    short: "Transport",    icon: Bus,           gradient: "from-blue-600 to-indigo-700" },
  bibliotheque: { label: "CARTE LECTEUR",      short: "Bibliothèque", icon: Library,       gradient: "from-emerald-600 to-teal-700" },
  visiteur:     { label: "BADGE VISITEUR",     short: "Visiteur",     icon: UserCheck,     gradient: "from-rose-500 to-red-600" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Encode QR : type:ecole_id:matricule:annee */
export function buildQrPayload(d: CardData): string {
  return `${d.type.toUpperCase()}:${d.ecoleId}:${d.matricule}:${d.anneeScolaire}`;
}

interface Props {
  data: CardData;
  side?: "recto" | "verso";
  /** scale visuel (1 = format CR80 réel à l'écran). */
  scale?: number;
  className?: string;
}

/**
 * Carte au format CR80 standard (85.6 × 54 mm) — orientation paysage.
 * À 96dpi : 323px × 204px (≈ 3.78 px/mm)
 */
export function SchoolCard({ data, side = "recto", scale = 1, className }: Props) {
  const meta = TYPE_META[data.type];
  const Icon = meta.icon;
  const W = 323;
  const H = 204;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-card text-card-foreground shadow-[var(--shadow-card)] border",
        "print:shadow-none print:border-[0.5px] print:border-black/30",
        className
      )}
      style={{
        width: W * scale,
        height: H * scale,
        transformOrigin: "top left",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: W, height: H }}
      >
        {side === "recto" ? <CardRecto data={data} /> : <CardVerso data={data} />}
      </div>
    </div>
  );
}

function CardRecto({ data }: { data: CardData }) {
  const meta = TYPE_META[data.type];
  const Icon = meta.icon;
  const primary = data.couleurPrimaire ?? "hsl(var(--primary))";
  const accent = data.couleurAccent ?? "hsl(var(--accent))";

  return (
    <div className="relative h-full w-full bg-white text-slate-900 flex flex-col">
      {/* Bandeau supérieur */}
      <div
        className="px-3 py-2 flex items-center gap-2 text-white"
        style={{ background: `linear-gradient(135deg, ${primary}, ${primary}cc)` }}
      >
        {data.ecoleLogo ? (
          <img src={data.ecoleLogo} alt="" className="h-7 w-7 rounded bg-white/20 object-contain p-0.5" />
        ) : (
          <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold leading-tight truncate uppercase tracking-wider">
            {data.ecoleNom}
          </p>
          {data.ecoleVille && (
            <p className="text-[8px] opacity-90 leading-tight">{data.ecoleVille}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[8px] opacity-90 leading-tight">Année</p>
          <p className="text-[9px] font-bold leading-tight">{data.anneeScolaire}</p>
        </div>
      </div>

      {/* Titre type carte */}
      <div
        className="px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-white"
        style={{ background: accent }}
      >
        {meta.label}
      </div>

      {/* Corps */}
      <div className="flex-1 flex p-3 gap-3 min-h-0">
        {/* Photo */}
        <div className="w-[70px] shrink-0">
          <div className="w-[70px] h-[88px] rounded border-2 overflow-hidden bg-slate-100 flex items-center justify-center" style={{ borderColor: primary }}>
            {data.photo ? (
              <img src={data.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <p className="text-[7px] text-center mt-1 font-mono text-slate-500">{data.matricule}</p>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div>
              <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Nom</p>
              <p className="text-[12px] font-bold leading-tight uppercase truncate">{data.nom}</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Prénom</p>
              <p className="text-[11px] font-semibold leading-tight truncate">{data.prenom}</p>
            </div>

            {/* Champs spécifiques */}
            <SpecificFields data={data} />
          </div>

          <div className="flex items-end justify-between gap-2 mt-1">
            <div>
              <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Valide jusqu'au</p>
              <p className="text-[9px] font-semibold leading-tight">{fmtDate(data.validJusqu)}</p>
            </div>
            <div className="rounded bg-white p-0.5 border">
              <QRCodeSVG value={buildQrPayload(data)} size={42} level="M" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecificFields({ data }: { data: CardData }) {
  switch (data.type) {
    case "eleve":
      return (
        <div>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Classe</p>
          <p className="text-[10px] font-bold leading-tight">{data.classe ?? "—"}</p>
        </div>
      );
    case "personnel":
      return (
        <div>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Fonction</p>
          <p className="text-[10px] font-bold leading-tight truncate">{data.fonction ?? "—"}</p>
        </div>
      );
    case "cantine":
      return (
        <div>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Formule</p>
          <p className="text-[10px] font-bold leading-tight">{data.formule ?? "—"}</p>
          {data.classe && <p className="text-[8px] text-slate-600">Classe : {data.classe}</p>}
        </div>
      );
    case "transport":
      return (
        <div>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Ligne</p>
          <p className="text-[10px] font-bold leading-tight">{data.ligne ?? "—"}</p>
          {data.arret && <p className="text-[8px] text-slate-600">Arrêt : {data.arret}</p>}
        </div>
      );
    case "bibliotheque":
      return (
        <div>
          <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">N° Lecteur</p>
          <p className="text-[10px] font-bold leading-tight font-mono">{data.numLecteur ?? "—"}</p>
        </div>
      );
    case "visiteur":
      return (
        <>
          <div>
            <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Motif</p>
            <p className="text-[9px] font-semibold leading-tight truncate">{data.motif ?? "—"}</p>
          </div>
          {data.hote && (
            <div>
              <p className="text-[7px] uppercase tracking-wider text-slate-500 leading-none">Hôte</p>
              <p className="text-[9px] leading-tight truncate">{data.hote}</p>
            </div>
          )}
        </>
      );
  }
}

function CardVerso({ data }: { data: CardData }) {
  const primary = data.couleurPrimaire ?? "hsl(var(--primary))";
  return (
    <div className="relative h-full w-full bg-white text-slate-900 flex flex-col">
      {/* Bande magnétique simulée */}
      <div className="h-7 w-full mt-3" style={{ background: "#1a1a1a" }} />

      <div className="flex-1 p-3 text-[8px] leading-tight space-y-2">
        <p className="font-bold uppercase tracking-wider" style={{ color: primary }}>
          Conditions d'utilisation
        </p>
        <p className="text-slate-700">
          Cette carte est strictement personnelle. Toute perte ou vol doit être
          immédiatement signalé à l'administration. La présentation peut être exigée
          à tout moment dans l'enceinte de l'établissement.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <p className="text-[7px] uppercase text-slate-500">En cas d'urgence</p>
            <p className="font-semibold">{data.ecoleNom}</p>
            {data.ecoleVille && <p className="text-slate-600">{data.ecoleVille}</p>}
          </div>
          <div className="text-right">
            <p className="text-[7px] uppercase text-slate-500">Code de vérification</p>
            <p className="font-mono font-bold">{data.matricule}</p>
            <p className="font-mono text-[7px] text-slate-500">{data.ecoleId}</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 text-[7px] text-white text-center" style={{ background: primary }}>
        © {new Date().getFullYear()} {data.ecoleNom} — Document officiel
      </div>
    </div>
  );
}
