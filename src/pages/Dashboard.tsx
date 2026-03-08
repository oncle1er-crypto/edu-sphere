import { GraduationCap, Users, DollarSign, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";

const barData = [
  { name: "6ème", eleves: 120 },
  { name: "5ème", eleves: 98 },
  { name: "4ème", eleves: 115 },
  { name: "3ème", eleves: 87 },
  { name: "2nde", eleves: 105 },
  { name: "1ère", eleves: 92 },
  { name: "Tle", eleves: 78 },
];

const pieData = [
  { name: "Réussite", value: 78 },
  { name: "Échec", value: 22 },
];

const revenueData = [
  { month: "Sep", montant: 4500000 },
  { month: "Oct", montant: 3800000 },
  { month: "Nov", montant: 5200000 },
  { month: "Déc", montant: 4100000 },
  { month: "Jan", montant: 6200000 },
  { month: "Fév", montant: 5800000 },
  { month: "Mar", montant: 4900000 },
];

const recentStudents = [
  { nom: "Diallo Aminata", classe: "3ème A", date: "05 Mar 2026" },
  { nom: "Traoré Moussa", classe: "6ème B", date: "04 Mar 2026" },
  { nom: "Koné Fatou", classe: "Tle S1", date: "03 Mar 2026" },
  { nom: "Camara Ibrahim", classe: "2nde C", date: "02 Mar 2026" },
  { nom: "Bamba Aïcha", classe: "4ème A", date: "01 Mar 2026" },
];

const COLORS = [
  "hsl(348, 60%, 28%)",
  "hsl(48, 92%, 55%)",
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d'ensemble de votre établissement
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Élèves"
          value="1 245"
          change="+12% ce mois"
          changeType="up"
          icon={GraduationCap}
          color="primary"
        />
        <StatCard
          title="Enseignants"
          value="68"
          change="+3 ce trimestre"
          changeType="up"
          icon={Users}
          color="accent"
        />
        <StatCard
          title="Revenus Mensuels"
          value="4.9M FCFA"
          change="-5% vs Oct"
          changeType="down"
          icon={DollarSign}
          color="warning"
        />
        <StatCard
          title="Taux de Réussite"
          value="78%"
          change="+2.5% vs 2025"
          changeType="up"
          icon={TrendingUp}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Élèves par classe</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(214, 20%, 90%)",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="eleves" fill="hsl(348, 60%, 28%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Taux de Réussite</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  Réussite 78%
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  Échec 22%
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Revenus mensuels (FCFA)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(value: number) => `${(value / 1000000).toFixed(1)}M FCFA`} />
                  <Line
                    type="monotone"
                    dataKey="montant"
                    stroke="hsl(48, 92%, 55%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(48, 92%, 55%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Inscriptions récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentStudents.map((s, i) => (
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
