import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-primary text-white hover:brightness-110 disabled:opacity-40',
  secondary:
    'bg-surface-card text-ink-primary border border-border-subtle hover:bg-bg-primary disabled:opacity-40',
  ghost:
    'bg-transparent text-ink-primary hover:bg-black/5 disabled:opacity-40',
  danger:
    'bg-transparent text-red-600 hover:bg-red-50 disabled:opacity-40',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 px-5 h-btn-h rounded-card font-semibold text-[17px] transition active:scale-[0.98] ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
