import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  text: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/** Petite icône (?) survolable affichant une explication courte. */
export function HelpTooltip({ text, className, side = "top" }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Aide"
            className={cn(
              "inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary transition-colors align-middle",
              className,
            )}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default HelpTooltip;
