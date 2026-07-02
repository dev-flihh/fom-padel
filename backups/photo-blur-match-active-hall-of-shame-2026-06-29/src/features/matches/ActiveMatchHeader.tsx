import { Share2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { InstallAppButton } from '../../components/app/InstallAppButton';

export const ActiveMatchHeader = ({
  isTournamentEnded,
  accentTheme,
  onShareMatch
}: {
  isTournamentEnded: boolean;
  isSharedViewer: boolean;
  accentTheme: {
    solid: string;
    solidShadow: string;
  };
  onShareMatch: () => void;
}) => (
  <header
    className="relative z-20 bg-transparent border-b border-transparent"
    style={{ paddingTop: 'calc(var(--app-safe-top, 0px) + 12px)' }}
  >
    <div className="standings-header-inner max-w-lg mx-auto h-10 px-5 relative flex items-center justify-between">
      <div className="shrink-0">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white rounded-full", accentTheme.solid, accentTheme.solidShadow)}>
          {!isTournamentEnded && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/55 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          )}
          <span className={cn(!isTournamentEnded && "animate-pulse")}>
            {isTournamentEnded ? 'Ended' : 'Live'}
          </span>
        </span>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
        <img
          src="/fom-long-logotype-white.png"
          alt="Friends of Motion"
          className="standings-header-logo h-7 w-auto object-contain"
        />
      </div>
      <div className="standings-header-actions shrink-0 flex items-center gap-3">
        <InstallAppButton
          compact
          variant="minimum"
          className="standings-header-install text-white"
        />
        <button
          onClick={onShareMatch}
          className="standings-header-share tap-target h-8 px-0 inline-flex items-center gap-1.5 border-0 bg-transparent text-white"
          aria-label="Share match"
        >
          <Share2 size={16} />
          <span className="standings-header-share-label text-[12px] font-semibold">Share</span>
        </button>
      </div>
    </div>
  </header>
);
