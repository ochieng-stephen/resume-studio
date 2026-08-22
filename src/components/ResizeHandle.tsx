import { useState } from "react";

interface ResizeHandleProps {
  /** "vertical" = a draggable vertical line, dragged left/right, for resizing width. */
  orientation: "vertical" | "horizontal";
  /** Called with the pointer's movement along the drag axis since the last call, rAF-coalesced. */
  onResize: (delta: number) => void;
  onReset?: () => void;
}

export function ResizeHandle({ orientation, onResize, onReset }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const vertical = orientation === "vertical";

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    document.body.style.cursor = vertical ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    let last = vertical ? e.clientX : e.clientY;
    let pending = 0;
    let raf: number | null = null;

    const flush = () => {
      raf = null;
      if (pending !== 0) {
        onResize(pending);
        pending = 0;
      }
    };
    const onMove = (ev: PointerEvent) => {
      const pos = vertical ? ev.clientX : ev.clientY;
      pending += pos - last;
      last = pos;
      if (raf === null) raf = requestAnimationFrame(flush);
    };
    const onUp = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      flush();
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      title="Drag to resize · Double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      className={`group relative z-10 flex shrink-0 items-center justify-center ${
        vertical ? "w-2.5 cursor-col-resize" : "h-2.5 cursor-row-resize"
      }`}
    >
      <div
        className={`rounded-full transition-colors duration-100 ${vertical ? "h-full w-px" : "h-px w-full"} ${
          dragging
            ? "bg-[var(--color-accent)]"
            : "bg-[var(--color-border)] group-hover:bg-[var(--color-accent)]"
        }`}
      />
    </div>
  );
}
