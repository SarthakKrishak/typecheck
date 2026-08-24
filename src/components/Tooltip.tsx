import { useState, useRef, useEffect, useCallback } from "react";

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

/** Themed tooltip — replaces native `title` attr. Renders on hover with 150ms delay. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ x: r.left + r.width / 2, y: side === "top" ? r.top - 8 : r.bottom + 8 });
      setVisible(true);
    }, 150);
  }, [side]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className="fixed z-[80] pointer-events-none px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium leading-snug whitespace-pre-line animate-[fadeIn_0.1s_ease]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-strong)",
            boxShadow: "var(--shadow-md)",
            left: pos.x,
            top: pos.y,
            transform: `translateX(-50%) ${side === "top" ? "translateY(-100%)" : ""}`,
            maxWidth: 280,
          }}
        >
          {content}
          {/* arrow */}
          <span
            className="absolute w-2 h-2 rotate-45"
            style={{
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border-strong)",
              borderBottom: "1px solid var(--border-strong)",
              left: "50%",
              ...(side === "top"
                ? { bottom: -5, transform: "translateX(-50%) rotate(45deg)" }
                : { top: -5, transform: "translateX(-50%) rotate(-135deg)" }),
            }}
          />
        </span>
      )}
    </span>
  );
}
