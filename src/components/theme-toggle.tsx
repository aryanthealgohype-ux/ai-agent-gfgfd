import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "aios.theme";

export function readTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  localStorage.setItem(KEY, choice);
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Applies the stored preference on mount and follows the OS in system mode. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = readTheme();
    setTheme(stored);
    applyTheme(stored);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return {
    theme,
    setTheme: (next: ThemeChoice) => {
      setTheme(next);
      applyTheme(next);
    },
  };
}

const OPTIONS: Array<{ value: ThemeChoice; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5", className)}
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => setTheme(option.value)}
          className={cn(
            "grid size-7 place-items-center rounded-md transition-colors",
            theme === option.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <option.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
