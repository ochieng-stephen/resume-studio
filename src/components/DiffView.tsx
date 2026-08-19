import { diffLines } from "diff";

export function DiffView({
  leftLabel,
  leftContent,
  rightLabel,
  rightContent,
}: {
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
}) {
  const changes = diffLines(leftContent, rightContent);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-3 py-1.5 text-[11px]">
        <span className="text-red-600 dark:text-red-400">− {leftLabel}</span>
        <span className="text-green-600 dark:text-green-400">+ {rightLabel}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--color-bg)] p-4 font-mono text-xs leading-relaxed">
        {changes.map((part, i) => {
          const lines = part.value.split("\n");
          if (lines[lines.length - 1] === "") lines.pop();
          const style = part.added
            ? "border-l-2 border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
            : part.removed
              ? "border-l-2 border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
              : "border-l-2 border-transparent text-[var(--color-text-muted)]";
          return (
            <div key={i} className={style}>
              {lines.map((line, li) => (
                <div key={li} className="whitespace-pre-wrap pl-2">
                  {part.added ? "+ " : part.removed ? "- " : "  "}
                  {line}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
