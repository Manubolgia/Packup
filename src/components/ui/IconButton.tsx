import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control must still announce itself. */
  label: string;
  bordered?: boolean;
  children: ReactNode;
}

export function IconButton({
  label,
  bordered = false,
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={[
        'grid h-11 w-11 shrink-0 place-items-center text-[var(--app-muted)]',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
        'hover:text-[var(--app-fg)] disabled:pointer-events-none disabled:opacity-40',
        bordered ? 'border border-[var(--app-border-strong)]' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
