import { useEffect, type RefObject } from "react";

/**
 * Shared modal behavior: Esc to close, lock background scroll while open,
 * autofocus the dialog, and trap Tab inside it (a11y).
 */
export function useModalBehavior(
  open: boolean,
  onClose: () => void,
  dialogRef?: RefObject<HTMLElement | null>,
) {
  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // Lock background scroll + autofocus + Tab trap
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef?.current;
    const prevActive = document.activeElement as HTMLElement | null;
    // Focus first focusable (or the dialog itself with tabindex=-1)
    const focusables = () =>
      Array.from(
        (dialog ?? document).querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    const initial = focusables()[0] ?? dialog;
    initial?.focus?.();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onTab, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onTab, true);
      prevActive?.focus?.();
    };
  }, [open, dialogRef]);
}
