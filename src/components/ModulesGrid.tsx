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
}

const modules: ModuleItem[] = [
  { title: "ÉLÈVES", description: "Gérer les élèves", icon: GraduationCap, to: "/eleves" },
  { title: "ENSEIGNANTS", description: "Gérer les enseignants", icon: Users, to: "/enseignants" },
  { title: "CLASSES", description: "Gérer les classes", icon: BookOpen, to: "/classes" },
  { title: "MATIÈRES", description: "Gérer les matières", icon: Library, to: "/matieres" },
  { title: "NOTES", description: "Saisir et consulter les notes", icon: ClipboardList, to: "/examens" },
  { title: "BULLETINS", description: "Générer les bulletins", icon: FileText, to: "/examens" },
  { title: "EMPLOI DU TEMPS", description: "Gérer les emplois du temps", icon: Calendar, to: "/emploi-du-temps" },
  { title: "PAIEMENTS", description: "Gérer les paiements", icon: DollarSign, to: "/finances" },
  { title: "CANTINE", description: "Menus et abonnés", icon: UtensilsCrossed, to: "/cantine" },
  { title: "TRANSPORT", description: "Lignes et passagers", icon: Bus, to: "/transport" },
  { title: "COMMUNICATION", description: "Messages et notifications", icon: MessageSquare, to: "/communication" },
  { title: "PARAMÈTRES", description: "Configuration système", icon: Settings, to: "/parametres" },
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
            className="module-card group relative block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] hover:shadow-glow p-4 md:p-5 text-center transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1"
          >
            <div className="relative mx-auto mb-3 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-gradient-primary-soft transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
              <span className="absolute inset-0 rounded-xl bg-gradient-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <m.icon className="h-7 w-7 md:h-8 md:w-8 text-primary transition-colors duration-300 group-hover:text-primary" strokeWidth={2.2} />
            </div>
            <h3 className="text-xs md:text-sm font-extrabold tracking-wide text-primary transition-colors">
              {m.title}
            </h3>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
              {m.description}
            </p>
            {/* subtle accent line */}
            <span className="pointer-events-none absolute inset-x-4 bottom-2 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary/0 via-accent to-primary/0 transition-transform duration-300 group-hover:scale-x-100" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
