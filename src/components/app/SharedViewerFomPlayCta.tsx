import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SharedViewerFomPlayCta = ({
  className
}: {
  className?: string;
}) => (
  <aside
    className={cn(
      'pointer-events-none fixed inset-x-0 z-[80] px-5',
      className
    )}
    style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 12px)' }}
    aria-label="Try FOM Play"
  >
    <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-3 rounded-[18px] border border-white/55 bg-white/88 px-3.5 py-2.5 text-on-surface shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-semibold leading-tight text-on-surface/86">Wanna try FOM Play?</p>
        <p className="mt-0.5 truncate text-[9.5px] font-medium leading-tight text-ios-gray">
          Live scoring and standings.
        </p>
      </div>
      <a
        href="https://fomplay.asia/"
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 text-[10.5px] font-bold text-primary"
      >
        <span>Start your match</span>
        <ArrowRight size={13} />
      </a>
    </div>
  </aside>
);
