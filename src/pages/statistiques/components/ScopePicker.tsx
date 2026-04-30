import { useState, ReactNode } from "react";
import { useEcoles } from "@/context/EcoleContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export type Scope = "all" | string;

interface Props {
  children: (scope: Scope) => ReactNode;
}

export function ScopePicker({ children }: Props) {
  const { ecoles } = useEcoles();
  const [scope, setScope] = useState<Scope>("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-muted/40 border rounded-lg px-3 py-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Périmètre :</span>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="max-w-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Réseau entier ({ecoles.length} écoles)</SelectItem>
            {ecoles.map((e) => (
              <SelectItem key={e.ecole_id} value={e.ecole_id}>{e.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {children(scope)}
    </div>
  );
}
