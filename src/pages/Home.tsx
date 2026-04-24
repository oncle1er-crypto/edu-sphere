import { ModulesGrid } from "@/components/ModulesGrid";
import { HeroPanel } from "@/components/HeroPanel";

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.4fr)] gap-6 lg:gap-8">
      <section aria-label="Modules">
        <ModulesGrid />
      </section>

      {/* Gold vertical divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-accent to-transparent" />

      <section aria-label="Présentation">
        <HeroPanel />
      </section>
    </div>
  );
}
