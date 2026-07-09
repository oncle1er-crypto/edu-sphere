import { useEffect, useState } from "react";
import { GraduationCap, Users, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

const COLORS = ["hsl(345, 65%, 28%)", "hsl(50, 95%, 60%)"];

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface DashboardData {
  totalEleves: number;
  totalEnseignants: number;
  revenuMois: number;
  revenuMoisPrec: number;
  tauxReussite: number;
  barData: { name: string; eleves: number }[];
  pieData: { name: string; value: number }[];
  revenueData: { month: string; montant: number }[];
  recentStudents: { nom: string; classe: string; date: string }[];
}

export default function Dashboard() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ecoleLoading) return;
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      setLoading(true);

      const [elevesRes, ensRes, paiementsRes, bulletinsRes, recentsRes] = await Promise.all([
        supabase.from("eleves").select("id, classe_id, created_at, nom, prenom, classes(nom)").eq("ecole_id", ecoleId),
        supabase.from("enseignants").select("id").eq("ecole_id", ecoleId),
        supabase.from("paiements").select("montant, created_at").eq("ecole_id", ecoleId),
        supabase.from("bulletins_audit").select("moyenne").eq("ecole_id", ecoleId).not("moyenne", "is", null),
        supabase.from("eleves").select("nom, prenom, created_at, classes(nom)").eq("ecole_id", ecoleId).order("created_at", { ascending: false }).limit(5),
      ]);

      const eleves = (elevesRes.data ?? []) as any[];
      const paiements = (paiementsRes.data ?? []) as any[];
      const bulletins = (bulletinsRes.data ?? []) as any[];

      // Élèves par classe
      const counts: Record<string, number> = {};
      eleves.forEach((e) => {
        const c = e.classes?.nom ?? "—";
        counts[c] = (counts[c] ?? 0) + 1;
      });
      const barData = Object.entries(counts)
        .map(([name, eleves]) => ({ name, eleves }))
        .sort((a, b) => b.eleves - a.eleves)
        .slice(0, 12);

      // Revenus par mois (12 derniers)
      const now = new Date();
      const revByMonth: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revByMonth[k] = 0;
      }
      paiements.forEach((p) => {
        const d = new Date(p.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (k in revByMonth) revByMonth[k] += Number(p.montant ?? 0);
      });
      const revenueData = Object.entries(revByMonth).map(([k, montant]) => ({
        month: MOIS[parseInt(k.split("-")[1]) - 1],
        montant,
      }));

      const keys = Object.keys(revByMonth);
      const revenuMois = revByMonth[keys[keys.length - 1]] ?? 0;
      const revenuMoisPrec = revByMonth[keys[keys.length - 2]] ?? 0;

      // Taux réussite (moyenne ≥ 10)
      let tauxReussite = 0;
      if (bulletins.length > 0) {
        const ok = bulletins.filter((b) => Number(b.moyenne) >= 10).length;
        tauxReussite = Math.round((ok / bulletins.length) * 100);
      }

      const recentStudents = ((recentsRes.data ?? []) as any[]).map((s) => ({
        nom: `${s.prenom ?? ""} ${s.nom ?? ""}`.trim(),
        classe: s.classes?.nom ?? "—",
        date: new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      }));

      setData({
        totalEleves: eleves.length,
        totalEnseignants: (ensRes.data ?? []).length,
        revenuMois,
        revenuMoisPrec,
        tauxReussite,
        barData: barData.length > 0 ? barData : [{ name: "Aucune classe", eleves: 0 }],
        pieData: [
          { name: "Réussite", value: tauxReussite },
          { name: "Échec", value: 100 - tauxReussite },
        ],
        revenueData,
        recentStudents,
      });
      setLoading(false);
    })();
  }, [ecoleId, ecoleLoading]);

  if (loading || ecoleLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }
  if (!data) return null;

  const revenueDelta = data.revenuMoisPrec > 0
    ? Math.round(((data.revenuMois - data.revenuMoisPrec) / data.revenuMoisPrec) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre établissement</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Élèves" value={data.totalEleves.toLocaleString("fr-FR")} change="actualisé" changeType="up" icon={GraduationCap} color="primary" />
        <StatCard title="Enseignants" value={data.totalEnseignants.toString()} change="actualisé" changeType="up" icon={Users} color="accent" />
        <StatCard title="Revenus du mois" value={`${(data.revenuMois / 1_000_000).toFixed(1)}M FCFA`} change={`${revenueDelta >= 0 ? "+" : ""}${revenueDelta}% vs mois préc.`} changeType={revenueDelta >= 0 ? "up" : "down"} icon={DollarSign} color="warning" />
        <StatCard title="Taux de Réussite" value={`${data.tauxReussite}%`} change="bulletins enregistrés" changeType="up" icon={TrendingUp} color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-display">Élèves par classe</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }} />
                  <Bar dataKey="eleves" fill="hsl(345, 65%, 28%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-base font-display">Taux de Réussite</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {data.pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Réussite {data.tauxReussite}%</div>
                <div className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Échec {100 - data.tauxReussite}%</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-display">Revenus mensuels (FCFA)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => `${(value / 1_000_000).toFixed(2)}M FCFA`} />
                  <Line type="monotone" dataKey="montant" stroke="hsl(50, 95%, 60%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(50, 95%, 60%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-base font-display">Inscriptions récentes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentStudents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun élève inscrit récemment.</p>
                )}
                {data.recentStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{s.nom}</p>
                      <p className="text-xs text-muted-foreground">{s.classe}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
