"use client";

import { ChevronsLeft, LogIn, LogOut } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { User } from "@supabase/supabase-js";
import { Tooltip } from "@/ui/Tooltip";

export function AsideHeader({
  user,
  copy,
  onSignIn,
  onSignOut,
  onCollapse,
}: {
  user: User | null;
  copy: Dictionary;
  onSignIn: () => void;
  onSignOut: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="px-3.5 py-4">
      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1">
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-overlay-strong">
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name || user.email || "Avatar"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[12px] font-medium text-foreground">
                {user.user_metadata.full_name || user.email?.split("@")[0]}
              </span>
            </div>
            <Tooltip content={copy.auth.signOut} placement="bottom">
              <button
                onClick={onSignOut}
                className="shrink-0 rounded p-1 text-muted/70 transition-colors hover:bg-overlay hover:text-foreground"
                aria-label={copy.auth.signOut}
              >
                <LogOut size={12} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="group flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-1 pr-2 text-left transition-colors hover:text-foreground"
          >
            <LogIn size={15} className="shrink-0 text-muted group-hover:text-foreground" />
            <span className="truncate text-[12px] font-medium text-foreground/80 group-hover:text-foreground">
              {copy.auth.signIn}
            </span>
          </button>
        )}

        <Tooltip content={copy.aside.collapse} placement="bottom">
          <button
            type="button"
            onClick={onCollapse}
            className="shrink-0 rounded-md p-1.5 text-muted/70 transition-colors hover:bg-overlay hover:text-foreground"
            aria-label={copy.aside.collapse}
          >
            <ChevronsLeft size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
