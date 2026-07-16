"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { useAsideCtx } from "./AsideContext";
import { STEP } from "./utils";

export function NewNoteInput({ depth, folderId }: { depth: number; folderId: string | null }) {
  const { cancelCreateNote, submitCreateNote, copy } = useAsideCtx();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function commit() {
    const name = value.trim();
    if (name) submitCreateNote(folderId, name);
    else cancelCreateNote();
  }

  return (
    <div
      className="flex items-center gap-1.5 py-[5px] pr-2"
      style={{ paddingLeft: `${10 + depth * STEP}px` }}
    >
      <span className="w-[13px] shrink-0" />
      <FileText size={13} className="shrink-0 text-ink/30" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancelCreateNote();
        }}
        placeholder={copy.forms.noteNamePlaceholder}
        className="min-w-0 flex-1 rounded bg-ink/[0.07] px-2 py-0.5 text-[13px] text-foreground placeholder:text-ink/20 outline-none ring-1 ring-ink/15 focus:ring-ink/35 transition-shadow"
      />
    </div>
  );
}
