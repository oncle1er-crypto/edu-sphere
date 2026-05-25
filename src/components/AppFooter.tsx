import { ShieldCheck, GraduationCap } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "SÉCURISÉ & CONFIDENTIEL",
    text: "Vos données sont protégées",
  },
  {
    icon: GraduationCap,
    title: "NOTRE MISSION",
    text: "Offrir une éducation de qualité pour construire un avenir meilleur.",
  },
];

export function AppFooter() {
  return (
    <footer className="bg-primary text-primary-foreground border-t-4 border-accent">
      <div className="px-4 md:px-8 py-6 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-accent">
              <item.icon className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest text-accent">
                {item.title}
              </p>
              <p className="text-sm text-primary-foreground/80 mt-0.5">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/10 px-4 md:px-8 py-3 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Gestion Scolaire — Tous droits réservés.
      </div>
    </footer>
  );
}
