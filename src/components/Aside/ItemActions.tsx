import { MoreHorizontal } from "lucide-react";
import { Tooltip } from "@/ui/Tooltip";

export function ItemActions({
  onMore,
  label,
}: {
  onMore?: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <span data-no-drag="" className="visible flex shrink-0 items-center gap-px md:invisible md:group-hover:visible md:group-focus-within:visible">
      <Tooltip content={label}>
        <button
          type="button"
          aria-label={label}
          className="-m-1 rounded p-1.5 text-ink/35 transition-colors hover:bg-ink/[0.08] hover:text-ink/70 md:m-0 md:p-0.5"
          onClick={onMore}
        >
          <MoreHorizontal size={12} />
        </button>
      </Tooltip>
    </span>
  );
}
