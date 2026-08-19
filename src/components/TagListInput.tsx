import { useState } from "react";

export function TagListInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const v = input.trim();
    if (!v || values.includes(v)) {
      setInput("");
      return;
    }
    onChange([...values, v]);
    setInput("");
  };

  const removeTag = (tag: string) => onChange(values.filter((v) => v !== tag));

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--color-text)]"
          >
            {v}
            <button
              className="text-[var(--color-text-muted)] hover:text-red-500"
              onClick={() => removeTag(v)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[100px] flex-1 bg-transparent px-1 py-0.5 text-[11px] text-[var(--color-text)] outline-none"
          placeholder={placeholder ?? "Add + Enter"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
            if (e.key === "Backspace" && !input && values.length > 0) {
              removeTag(values[values.length - 1]);
            }
          }}
          onBlur={addTag}
        />
      </div>
    </div>
  );
}
