import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface FieldProps {
  label: string;
  hint?: string;
  children: (props: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="u-label text-[0.625rem] text-[var(--app-muted)]">
        {label}
      </label>
      {children({ id, describedBy: hint ? hintId : undefined })}
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--app-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...rest }: InputProps) {
  return (
    <input
      className={[
        'min-h-11 w-full border border-[var(--app-border)] bg-[var(--app-sunken)] px-3',
        'text-base text-[var(--app-fg)] placeholder:text-[var(--app-faint)]',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
        'focus:border-[var(--app-accent)]',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
