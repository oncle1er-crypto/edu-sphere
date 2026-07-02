import { useMemo, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import {
  FileBadge, Search, Loader2, Printer, Download, ScrollText, GraduationCap, BookCheck,
} from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useEcoles } from "@/context/EcoleContext";
import { generateCertificatPDF, type CertificatData } from "@/lib/generateDocumentsPDF";
import { toast } from "sonner";

type DocType = CertificatData["type"];

const DOCUMENTS: Array<{
  key: DocType;
  label: string;
  desc: string;
  icon: typeof ScrollText;
}> = [
  {
    key: "scolarite",
    label: "Certificat de scolarité",
    desc: "Atteste l'inscription régulière de l'élève pour l'année en cours.",
    icon: GraduationCap,
  },
  {
    key: "inscription",
    label: "Attestation d'inscription",
    desc: "Document officiel d'inscription au sein de l'établissement.",
    icon: BookCheck,
  },
  {
    key: "frequentation",
    label: "Certificat de fréquentation",
    desc: "Confirme la présence régulière de l'élève en classe.",
    icon: ScrollText,
  },
];

function currentAnnee(): string {
  const now = new Date();
  const y = now.getFullYear();
  // Année scolaire CI : septembre → juin
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function StudentsAttestations() {
  const { activeAnnee } = useAcademicPeriod();
  const { eleves, loading } = useEleves(activeAnnee.id);
  const { currentEcole } = useEcoles();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const eleve = useMemo(() => eleves.find((e) => e.id === selectedId) ?? null, [eleves, selectedId]);

  const filtered = useMemo(
    () =>
      eleves.filter(
        (e) =>
          e.nom.toLowerCase().includes(q.toLowerCase()) ||
          e.prenom.toLowerCase().includes(q.toLowerCase()) ||
          e.matricule.toLowerCase().includes(q.toLowerCase()),
      ),
    [eleves, q],
  );

  const buildData = (type: DocType): CertificatData | null => {
    if (!eleve) return null;
    return {
      ecole: {
        nom: currentEcole?.nom ?? "Complexe Scolaire La Providence de Don Orione",
        devise: "Foi, Savoir, Excellence",
        adresse: currentEcole?.adresse ?? "Abidjan, Côte d'Ivoire",
        telephone: currentEcole?.telephone ?? "+225",
        directeur: currentEcole?.directeur ?? "",
      },
      eleve: {
        nom: eleve.nom,
        prenom: eleve.prenom,
        matricule: eleve.matricule,
        date_naissance: eleve.date_naissance
          ? new Date(eleve.date_naissance).toLocaleDateString("fr-FR")
          : "—",
        lieu_naissance: eleve.lieu_naissance ?? "—",
        photo_url: (eleve as any).photo_url ?? null,
      },
      classe: (eleve as any).classe_nom ?? "Non affecté",
      annee: currentAnnee(),
      type,
    };
  };

  const handlePrint = async (type: DocType) => {
    const data = buildData(type);
    if (!data) {
      toast.error("Sélectionnez d'abord un élève");
      return;
    }
    setBusy(`print-${type}`);
    try {
      const doc = await generateCertificatPDF(data);
      doc.autoPrint();
      const url = doc.output("bloburl");
      const w = window.open(url as unknown as string, "_blank");
      if (!w) {
        toast.error("Le navigateur a bloqué la fenêtre d'impression. Autorisez les pop-ups.");
      } else {
        toast.success("Impression lancée");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (type: DocType) => {
    const data = buildData(type);
    if (!data) {
      toast.error("Sélectionnez d'abord un élève");
      return;
    }
    setBusy(`dl-${type}`);
    try {
      const doc = await generateCertificatPDF(data);
      const fileName = `${type}_${eleve!.matricule}_${eleve!.nom}.pdf`.replace(/\s+/g, "_");
      doc.save(fileName);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<FileBadge className="h-5 w-5" />}
      title="Attestations & certificats"
      description="Générez et imprimez en un clic les documents officiels de l'élève."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <SearchableSelect
          value={selectedId}
          onValueChange={setSelectedId}
          placeholder="Sélectionner un élève"
          searchPlaceholder="Rechercher un élève..."
          className="w-full sm:w-80"
          fullWidth={false}
          options={filtered.slice(0, 200).map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom} — ${e.matricule}`, keywords: `${e.classe_nom ?? ""}` }))}
        />
      </div>

      {eleve ? (
        <>
          <div className="flex items-center gap-3 pb-2 border-b">
            <div>
              <h3 className="font-bold">
                {eleve.nom} {eleve.prenom}
              </h3>
              <p className="text-xs text-muted-foreground">
                {eleve.matricule} • {(eleve as any).classe_nom ?? "Non affecté"} • Année {currentAnnee()}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary">{DOCUMENTS.length} documents disponibles</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOCUMENTS.map((d) => {
              const Icon = d.icon;
              const printing = busy === `print-${d.key}`;
              const downloading = busy === `dl-${d.key}`;
              return (
                <Card key={d.key} className="border shadow-[var(--shadow-card)]">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{d.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {d.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handlePrint(d.key)}
                        disabled={!!busy}
                      >
                        {printing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Printer className="h-3.5 w-3.5" />
                        )}
                        Imprimer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleDownload(d.key)}
                        disabled={!!busy}
                      >
                        {downloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileBadge className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un élève pour générer ses attestations.</p>
        </div>
      )}
    </SettingsSection>
  );
}
