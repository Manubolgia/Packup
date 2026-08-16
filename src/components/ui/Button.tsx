import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--app-accent)] text-[var(--color-main)] hover:brightness-110',
  secondary:
    'border border-[var(--app-border-strong)] text-[var(--app-fg)] hover:bg-[var(--app-surface)]',
  ghost: 'text-[var(--app-muted)] hover:text-[var(--app-fg)]',
  danger:
    'border border-[var(--app-danger)] text-[var(--app-danger)] hover:bg-[var(--app-danger)] hover:text-[var(--color-secondary)]',
};

/** 44px minimum height: every action is a single confident tap (C5). */
export function Button({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'u-label inline-flex min-h-11 items-center justify-center gap-2 px-4 text-xs',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
