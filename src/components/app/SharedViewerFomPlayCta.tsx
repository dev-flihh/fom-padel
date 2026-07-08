import { AppLogo } from './AppLogo';
import { cn } from '../../lib/utils';

// Pil ramping "Hosted with FOM Play" untuk guest yang membuka link share.
// Gayanya mengikuti pil navigasi bawah (glass pill) dan diposisikan tepat
// di atasnya supaya keduanya terbaca sebagai satu floating stack.
export const SharedViewerFomPlayCta = ({
  className
}: {
  className?: string;
}) => (
  <aside
    className={cn(
      'pointer-events-none fixed inset-x-0 z-[95] px-5',
      className
    )}
    style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 78px)' }}
    aria-label="Hosted with FOM Play"
  >
    <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2.5 rounded-full border border-black/[0.06] bg-white/92 py-1.5 pl-3.5 pr-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <AppLogo className="h-3.5 w-[18px] shrink-0" />
      <p className="truncate text-[11px] font-semibold leading-none tracking-tight text-on-surface/75">
        Hosted with <span className="font-bold text-on-surface">FOM Play</span>
      </p>
      <a
        href="https://fomplay.asia/"
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-primary px-3 text-[10.5px] font-bold leading-none text-white"
      >
        Start yours
      </a>
    </div>
  </aside>
);
