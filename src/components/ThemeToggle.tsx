"use client";

import { Moon, Sun } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";
import { applyTheme, persistTheme, type Theme } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";

interface ThemeToggleProps {
  copy: { toLight: string; toDark: string };
  className?: string;
}

export function ThemeToggle({ copy, className }: ThemeToggleProps) {
  const theme = useTheme();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next); // mutates data-theme; useTheme's MutationObserver picks it up
    persistTheme(next);
  }

  const label = theme === "dark" ? copy.toLight : copy.toDark;

  return (
    <Tooltip content={label} placement="top">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={
          "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-overlay hover:text-foreground" +
          (className ? ` ${className}` : "")
        }
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </Tooltip>
  );
}
