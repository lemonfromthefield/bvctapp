import { cn } from '@/lib/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2.5 text-[#1f120f] placeholder:text-[#8f6a60] shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#b42318]/35 focus:shadow-[0_0_0_4px_rgba(180,35,24,0.08)]',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
