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
  navIconClass,
  navBorderClass,
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
  needsRegenerateFromRound,
  onOpenFomPlay,
  onOpenSettings,
  onOpenStandings
}: {
  isSharedViewer: boolean;
  statsSyncBadge: StatsSyncBadge;
  infoShadowClass: string;
  navIconClass: string;
  navBorderClass: string;
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
  needsRegenerateFromRound: number | null;
  onOpenFomPlay: () => void;
  onOpenSettings: () => void;
  onOpenStandings: () => void;
}) => (
  <>
    {isSharedViewer && (
      <p className="px-1 text-[10px] font-medium leading-tight text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        This page is read-only.
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
      "relative overflow-hidden rounded-[22px] border border-white/42 bg-white/10 p-3.5 backdrop-blur-md",
      infoShadowClass
    )}>
      <div className="relative mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-black leading-tight tracking-tight text-white">{matchName || '-'}</h2>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-white/82">{locationDateLabel}</p>
        </div>
        <span className="shrink-0 text-[13px] font-black leading-none tabular-nums text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
          {totalElapsed}
        </span>
      </div>

      <div className="relative grid grid-cols-4 gap-1.5">
        <SummaryStat label="Mode" value={format} />
        <SummaryStat label="Player" value={`${activePlayerCount}/${totalPlayerCount}`} />
        <SummaryStat label="Court" value={courts} />
        <SummaryStat label="Round" value={`${completedRounds}/${totalRounds || 0}`} />
      </div>

      <div className="relative mt-2.5 flex min-h-[34px] items-center justify-between gap-2 border-t border-white/24 pt-2">
        <p className="min-w-0 truncate text-[10.5px] font-semibold text-white/84">
          Hosted with{' '}
          <button
            type="button"
            onClick={onOpenFomPlay}
            className="inline p-0 bg-transparent border-0 font-bold text-white underline-offset-2 hover:underline cursor-pointer"
          >
            FOM Play
          </button>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isReadOnly && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={cn('tap-target inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/14 text-white backdrop-blur-md', navBorderClass)}
              aria-label="Match settings"
            >
              <Settings size={15} />
            </button>
          )}
          <button
            onClick={onOpenStandings}
            className={cn('tap-target inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border bg-white/18 px-3 text-[11px] font-extrabold text-white backdrop-blur-md', navBorderClass)}
          >
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full bg-white/90', navIconClass)}>
              <Trophy size={12} />
            </span>
            <span>Standings</span>
            <ChevronRight size={13} className="opacity-80" />
          </button>
        </div>
      </div>
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
  <div className="rounded-[11px] border border-white/26 bg-white/18 px-1.5 py-1.5">
    <p className="text-[8px] font-bold uppercase leading-none tracking-wider text-white/66">{label}</p>
    <p className="mt-1 truncate text-[10px] font-bold leading-none text-white">{value}</p>
  </div>
);
