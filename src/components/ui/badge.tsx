import { cn } from '@/lib/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-900',
    red: 'bg-red-100 text-red-900',
    orange: 'bg-orange-100 text-orange-900',
    yellow: 'bg-yellow-100 text-yellow-900',
    blue: 'bg-blue-100 text-blue-900',
    gray: 'bg-gray-100 text-gray-900',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
