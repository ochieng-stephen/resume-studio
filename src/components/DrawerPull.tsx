import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

// The drawer-pull ring used on every collapsible sidebar section header (Slash Commands,
// Profile, Portfolio). The ring itself is colored with --color-accent (the app's system/chrome
// accent, not the warm content amber). The caret icon's hover color/glow uses the
// --color-icon-hover / --color-icon-hover-glow tokens (index.css) rather than a hardcoded amber:
// light mode resolves them to the amber content accent (#c8975c), but dark mode deliberately
// overrides them to --color-accent instead (dark-mode-only, per explicit user direction) — so in
// dark mode the caret warms to the walnut system accent on hover, not amber. On hover the handle
// floats toward the viewer (the floating-icon-hover signature): it lifts, grows, warms to its
// hover color, and casts a soft glow — the same plain lift/scale/color/glow recipe as QuickTool's
// icons (`SimpleWorkspaceView.tsx`), tuned (bigger lift/scale) for this ring-and-handle
// affordance. No stroke-thickening here — that was tried
// (stacking four zero-blur `drop-shadow`s at ±1px around the glyph to optically fill in the
// stroke) and explicitly reverted per user direction in favor of a plain float, matching
// QuickTool's icons (which hit the same call for the same reason: see the WebKit rendering
// gotcha memory for this project — sub-pixel `drop-shadow` offsets silently don't rasterize in
// Tauri's WebKit webview, and the whole-pixel offset needed to be visible read as too heavy).
// Don't re-add thickening without a fresh explicit ask.
export function DrawerPull({ expanded }: { expanded: boolean }) {
  const Caret = expanded ? CaretDownIcon : CaretRightIcon;
  return (
    // border-color (not `opacity`) fades the ring — the icon is a child of this span, and
    // opacity compounds down the DOM tree, so fading the container's opacity would also fade
    // the icon no matter what opacity the icon itself declares.
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-accent)]/50 text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-[var(--color-accent)]/0">
      <Caret
        size={11}
        weight="bold"
        className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:scale-125 group-hover:text-[var(--color-icon-hover)] group-hover:drop-shadow-[0_5px_5px_var(--color-icon-hover-glow)]"
      />
    </span>
  );
}
