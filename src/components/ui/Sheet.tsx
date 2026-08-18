import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from '@/components/icons/Icon';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky action row; the primary action sits here, thumb-reachable. */
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The one bottom-sheet used by every flow in the app. Modal, focus-trapped,
 * dismissable by backdrop tap or Escape, and never taller than the safe area.
 */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first control so a keyboard user lands inside the sheet.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="no-press absolute inset-0 bg-[var(--app-scrim)] motion-safe:animate-[sheet-fade_var(--dur-travel)_var(--ease)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'relative flex max-h-[86dvh] flex-col border-t border-[var(--app-border-strong)]',
          'bg-[var(--app-surface)] motion-safe:animate-[sheet-rise_var(--dur-travel)_var(--ease)]',
        ].join(' ')}
        style={{
          paddingRight: 'var(--safe-right)',
          paddingLeft: 'var(--safe-left)',
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] py-2">
          <h2 id={titleId} className="u-label text-xs text-[var(--app-fg)]">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <IconClose size={20} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto py-4">{children}</div>

        {footer ? (
          <footer
            className="flex gap-2 border-t border-[var(--app-border)] pt-3"
            style={{ paddingBottom: 'var(--safe-bottom)' }}
          >
            {footer}
          </footer>
        ) : (
          <div style={{ height: 'var(--safe-bottom)' }} />
        )}
      </div>
    </div>
  );
}
