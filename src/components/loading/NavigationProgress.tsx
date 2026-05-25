import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fine barre de progression affichée en haut lors des changements de route.
 * Disparaît automatiquement une fois la nouvelle page rendue.
 */
export function NavigationProgress() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(55), 120);
    const t2 = setTimeout(() => setProgress(85), 280);
    const t3 = setTimeout(() => setProgress(100), 480);
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(hide);
    };
  }, [location.pathname]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
        style={{
          width: `${progress}%`,
          transition: "width 250ms ease",
        }}
      />
    </div>
  );
}

export default NavigationProgress;
