import { AlertTriangle, ChevronRight, Settings, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat } from '../../types';

type StatsSyncBadge = {
  tone: string;
  title: string;
  message: string;
} | null;

export const ActiveMatchSummaryPanel = ({
  isSharedViewer,
  statsSyncBadge,
  infoShadowClass,
  matchName,
  locationDateLabel,
  totalElapsed,
  format,
  activePlayerCount,
  totalPlayerCount,
  courts,
  completedRounds,
  totalRounds,
  isReadOnly,
  isTournamentEnded,
  needsRegenerateFromRound,
  onOpenFomPlay,
  onOpenSettings,
  onOpenStandings
}: {
  isSharedViewer: boolean;
  statsSyncBadge: StatsSyncBadge;
  infoShadowClass: string;
  matchName: string;
  locationDateLabel: string;
  totalElapsed: string;
  format: MatchFormat;
  activePlayerCount: number;
  totalPlayerCount: number;
  courts: number;
  completedRounds: number;
  totalRounds: number;
  isReadOnly: boolean;
  isTournamentEnded: boolean;
  needsRegenerateFromRound: number | null;
  onOpenFomPlay: () => void;
  onOpenSettings: () => void;
  onOpenStandings: () => void;
}) => (
  <>
    {isSharedViewer && (
      <p className="-mt-1 -mb-3 px-1 text-[10px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        Viewer mode is active. This page is read-only.
      </p>
    )}

    {statsSyncBadge && (
      <section className="-mt-1">
        <div className={cn('w-full rounded-2xl px-4 py-3 border backdrop-blur-md flex items-start gap-3', statsSyncBadge.tone)}>
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-tight">{statsSyncBadge.title}</p>
            <p className="mt-1 text-[12px] leading-snug font-medium">
              {statsSyncBadge.message}
            </p>
          </div>
        </div>
      </section>
    )}

    <section className={cn(
      "relative overflow-hidden rounded-2xl p-4 border border-white/40 bg-white/8 backdrop-blur-md",
      infoShadowClass
    )}>
      <div className="relative flex items-baseline justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-[18px] font-black tracking-tight text-white truncate">{matchName || '-'}</h2>
          <p className="mt-1 text-[11px] text-white/85 truncate">{locationDateLabel}</p>
        </div>
        <span className="shrink-0 text-[16px] leading-none font-display font-bold tabular-nums text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]">
          {totalElapsed}
        </span>
      </div>

      <div className="relative grid grid-cols-4 gap-2">
        <SummaryStat label="Mode" value={format} />
        <SummaryStat label="Player" value={`${activePlayerCount}/${totalPlayerCount}`} />
        <SummaryStat label="Court" value={courts} />
        <SummaryStat label="Round" value={`${completedRounds}/${totalRounds || 0}`} />
      </div>

      <div className="relative mt-3.5 pt-2.5 min-h-[30px] flex items-center justify-between gap-2">
        <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
        <p className="relative z-10 text-[11px] text-white/88 whitespace-nowrap">
          Hosted with{' '}
          <button
            type="button"
            onClick={onOpenFomPlay}
            className="inline p-0 bg-transparent border-0 font-bold text-white underline-offset-2 hover:underline cursor-pointer"
          >
            FOM Play
          </button>
        </p>
        {!isReadOnly && (
          <div className="relative z-10 shrink-0 h-8 inline-flex items-center">
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-8 w-8 rounded-full bg-white/12 border border-white/35 text-white inline-flex items-center justify-center tap-target"
              aria-label="Match settings"
            >
              <Settings size={15} />
            </button>
          </div>
        )}
      </div>
    </section>

    <section className="-mt-1">
      <button
        onClick={onOpenStandings}
        className={cn(
          "tap-target w-full h-12 rounded-2xl px-4 flex items-center justify-between border border-white/40 bg-white/8 backdrop-blur-md text-white",
          infoShadowClass
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/35 bg-white/20">
            <Trophy size={15} />
          </span>
          <span className="text-[13px] font-bold truncate">
            {isTournamentEnded ? 'View Final Standings' : 'View Live Standings'}
          </span>
        </div>
        <ChevronRight size={16} className="opacity-80 shrink-0" />
      </button>
    </section>

    {!isReadOnly && needsRegenerateFromRound !== null && (
      <section className="-mt-2">
        <div className="w-full rounded-2xl px-4 py-3 border border-amber-200 bg-amber-50/95 backdrop-blur-md flex items-center gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] leading-snug text-amber-900 font-medium">
              Older round scores changed. Open the action menu and regenerate from round {needsRegenerateFromRound}+.
            </p>
          </div>
        </div>
      </section>
    )}
  </>
);

const SummaryStat = ({
  label,
  value
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
    <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">{label}</p>
    <p className="text-[12px] font-semibold text-white truncate">{value}</p>
  </div>
);
