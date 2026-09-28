import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CaretDownIcon } from "@phosphor-icons/react";

// The interactive half of the shared field feel: a warm amber focus glow (the same accent the
// portfolio cards use) plus a soft hover border, instead of the browser default. Exported on its
// own so compact one-off controls that can't use the full-height field boxes below (a status
// dropdown in a dense table, a terminal command box) can still light up on focus the same way.
export const FIELD_FOCUS =
  "transition-colors hover:border-[var(--color-text-muted)] focus:border-[var(--color-icon-hover)] focus:ring-2 focus:ring-[var(--color-icon-hover)]/15";

// Shared shape/feel for every text field across the app's data-entry surfaces (Profile, Job
// Capture, Portfolio, Tracker, ATS checker, and any future form): soft corners and the warm focus
// glow above, so filling in your own information feels attended-to rather than like a bare dev-tool
// form. One source of truth keeps every form visually consistent — tweak it here, it lands
// everywhere. No `w-full` here so inline controls can size themselves; the wrapped fields add it.
export const INPUT_CLASS =
  `rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] ${FIELD_FOCUS}`;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-[11px] font-medium tracking-wide text-[var(--color-text-muted)]">
      {label}
      {required && <span className="text-[#c8975c]"> *</span>}
    </span>
  );
}

// The label wrapper carries `min-w-0` so a field placed in a flex/grid row can actually shrink to
// its track — without it, WebKit (Tauri's macOS webview) keeps the input at its intrinsic `size`
// width and clips the neighbour. `className` lands on the wrapper so callers can set grid spans
// (e.g. col-span-2) without the control itself losing its shared styling.
export function Field({
  label,
  required,
  className = "",
  ...props
}: { label: string; required?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <FieldLabel label={label} required={required} />
      <input className={`w-full ${INPUT_CLASS}`} {...props} />
    </label>
  );
}

export function TextareaField({
  label,
  required,
  className = "",
  rows = 4,
  ...props
}: { label: string; required?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <FieldLabel label={label} required={required} />
      <textarea rows={rows} className={`w-full ${INPUT_CLASS} resize-y leading-relaxed`} {...props} />
    </label>
  );
}

export function SelectField({
  label,
  required,
  className = "",
  children,
  ...props
}: { label: string; required?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <FieldLabel label={label} required={required} />
      {/* appearance-none strips WebKit's native select chrome (which renders "off" against the
          app's custom inputs); a hand-placed caret replaces it, and pr-8 keeps the value text
          clear of it. Text stays in the legible --color-text rather than the browser default. */}
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-2.5 pr-8 text-xs text-[var(--color-text)] outline-none ${FIELD_FOCUS}`}
          {...props}
        >
          {children}
        </select>
        <CaretDownIcon
          size={12}
          weight="bold"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
      </div>
    </label>
  );
}
