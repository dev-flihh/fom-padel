import { cn } from '../../lib/utils';

export const AppLogo = ({ className }: { className?: string }) => (
  <img
    src="/assets/fom-logomark-color.png"
    alt=""
    aria-hidden="true"
    className={cn('object-contain', className)}
  />
);
