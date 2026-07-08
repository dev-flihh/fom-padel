import { cn } from '../../lib/utils';

export const ReadOnlySharedTicker = ({ className }: { className?: string }) => (
  <p
    className={cn(
      'text-center text-[10px] font-black uppercase leading-none tracking-[0.22em] text-ios-gray/80',
      className
    )}
  >
    Read-only · Shared view
  </p>
);
