import { cn } from '@/lib/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md';

  const variants = {
    default:
      'border border-[#8b1e1e]/20 bg-gradient-to-r from-[#7f1d1d] via-[#b42318] to-[#f97316] text-white hover:brightness-105 focus:ring-[#b42318]',
    outline:
      'border border-[#d7bfb0] bg-white/85 text-[#4a2a24] hover:bg-[#fff6ef] focus:ring-[#b42318]',
    ghost: 'text-[#5f362d] hover:bg-[#f8ece4] focus:ring-[#b42318]',
    destructive:
      'bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white hover:brightness-105 focus:ring-[#dc2626]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}
