import {
  GraduationCap,
  Users,
  BookOpen,
  Library,
  ClipboardList,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Settings,
  UtensilsCrossed,
  Bus,
  LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface ModuleItem {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  /** HSL triplet (no hsl()) used as the dominant accent for this card */
  hue: string;
  /** Secondary HSL triplet used for the gradient end */
  hue2: string;
}

const modules: ModuleItem[] = [
  { title: "ÉLÈVES",          description: "Gérer les élèves",            icon: GraduationCap,    to: "/eleves",          hue: "345 65% 38%", hue2: "12 80% 55%" },
  { title: "ENSEIGNANTS",     description: "Gérer les enseignants",       icon: Users,            to: "/enseignants",     hue: "205 80% 48%", hue2: "190 75% 50%" },
  { title: "CLASSES",         description: "Gérer les classes",           icon: BookOpen,         to: "/classes",         hue: "265 60% 55%", hue2: "295 60% 55%" },
  { title: "MATIÈRES",        description: "Gérer les matières",          icon: Library,          to: "/matieres",        hue: "152 60% 38%", hue2: "168 65% 42%" },
  { title: "NOTES",           description: "Saisir et consulter les notes", icon: ClipboardList,  to: "/examens",         hue: "38 92% 50%",  hue2: "25 90% 55%" },
  { title: "BULLETINS",       description: "Générer les bulletins",       icon: FileText,         to: "/examens",         hue: "345 65% 35%", hue2: "320 60% 48%" },
  { title: "EMPLOI DU TEMPS", description: "Gérer les emplois du temps",  icon: Calendar,         to: "/emploi-du-temps", hue: "215 70% 50%", hue2: "245 65% 58%" },
  { title: "PAIEMENTS",       description: "Gérer les paiements",         icon: DollarSign,       to: "/finances",        hue: "150 65% 38%", hue2: "100 55% 45%" },
  { title: "CANTINE",         description: "Menus et abonnés",            icon: UtensilsCrossed,  to: "/cantine",         hue: "18 85% 55%",  hue2: "42 90% 55%" },
  { title: "TRANSPORT",       description: "Lignes et passagers",         icon: Bus,              to: "/transport",       hue: "48 95% 48%",  hue2: "32 90% 50%" },
  { title: "COMMUNICATION",   description: "Messages et notifications",   icon: MessageSquare,    to: "/communication",   hue: "330 75% 55%", hue2: "280 65% 58%" },
  { title: "PARAMÈTRES",      description: "Configuration système",       icon: Settings,         to: "/parametres",      hue: "220 15% 40%", hue2: "220 12% 55%" },
];

export function ModulesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {modules.map((m, i) => (
        <motion.div
          key={m.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to={m.to}
            style={
              {
                ["--card-hue" as any]: m.hue,
                ["--card-hue-2" as any]: m.hue2,
                background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(${m.hue} / 0.06) 100%)`,
                borderColor: `hsl(${m.hue} / 0.18)`,
              } as React.CSSProperties
            }
            className="group relative block overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] hover:shadow-[0_18px_40px_-18px_hsl(var(--card-hue)/0.55)] p-4 md:p-5 text-center transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1"
          >
            {/* Colored glow on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(120% 80% at 50% 0%, hsl(${m.hue} / 0.12), transparent 60%)`,
              }}
            />
            {/* Top color bar */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(90deg, hsl(${m.hue}), hsl(${m.hue2}))` }}
            />

            <div
              className="relative mx-auto mb-3 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
              style={{
                background: `linear-gradient(135deg, hsl(${m.hue} / 0.15) 0%, hsl(${m.hue2} / 0.22) 100%)`,
                boxShadow: `inset 0 0 0 1px hsl(${m.hue} / 0.18)`,
              }}
            >
              <span
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(135deg, hsl(${m.hue} / 0.18), hsl(${m.hue2} / 0.28))` }}
              />
              <m.icon
                className="relative h-7 w-7 md:h-8 md:w-8 transition-transform duration-300"
                strokeWidth={2.2}
                style={{ color: `hsl(${m.hue})` }}
              />
            </div>
            <h3
              className="text-xs md:text-sm font-extrabold tracking-wide transition-colors"
              style={{ color: `hsl(${m.hue})` }}
            >
              {m.title}
            </h3>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
              {m.description}
            </p>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-4 bottom-2 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
              style={{ background: `linear-gradient(90deg, transparent, hsl(${m.hue2}), transparent)` }}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
