import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show only on iOS Safari, not already installed as PWA
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isInStandaloneMode) {
      // Delay a bit so it doesn't pop immediately
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
        {/* App icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-2xl">🥚</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">Инсталирај ја апликацијата</div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Допрете{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
              <Share className="h-3.5 w-3.5" />
              Сподели
            </span>
            {" "}па{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
              <Plus className="h-3 w-3" />
              Додај на почетен екран
            </span>
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            Работи офлајн · Без прелистувач
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
          aria-label="Затвори"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
