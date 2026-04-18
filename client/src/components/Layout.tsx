import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Sun, Moon, Home, ChevronLeft } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  backTo?: string;
}

export default function Layout({ children, title, backTo }: LayoutProps) {
  const { theme, toggle } = useTheme();
  const [location] = useHashLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {backTo && (
              <Link href={backTo}>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="btn-back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {/* SVG Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer select-none">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Инкубатор лого">
                  <ellipse cx="14" cy="15" rx="9" ry="11" fill="currentColor" className="text-primary opacity-20"/>
                  <ellipse cx="14" cy="15" rx="9" ry="11" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                  <path d="M10 15 Q14 10 18 15" stroke="currentColor" strokeWidth="1.5" className="text-primary" fill="none" strokeLinecap="round"/>
                  <circle cx="14" cy="8" r="2.5" fill="currentColor" className="text-primary"/>
                  <path d="M14 10.5 L14 13" stroke="currentColor" strokeWidth="1.5" className="text-primary" strokeLinecap="round"/>
                </svg>
                <span className="font-semibold text-sm tracking-tight">Инкубатор</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {location !== "/" && (
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="btn-home">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggle}
              data-testid="btn-theme-toggle"
              aria-label="Смени тема"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Page title */}
      {title && (
        <div className="bg-gradient-to-b from-primary/8 to-transparent border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 py-5">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        21-дневен инкубатор за кокошки јајца · 37.5°C · 50–75% влажност
      </footer>
    </div>
  );
}
