import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  width?: number;   // px
  height?: number;  // px barres
  displayValue?: boolean;
  className?: string;
}

/** Code-barres CODE128 basé sur le matricule. */
export function StudentCardBarcode({
  value,
  width = 1.4,
  height = 36,
  displayValue = true,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue,
        fontSize: 11,
        font: "monospace",
        textMargin: 1,
        margin: 2,
        background: "#ffffff",
        lineColor: "#0a0a0a",
      });
    } catch {
      // valeur invalide
    }
  }, [value, width, height, displayValue]);

  return <svg ref={ref} className={className} />;
}
