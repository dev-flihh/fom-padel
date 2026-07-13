import type { FixedTeam, MatchFormat, MatchPlayMode, PartnerMode, Player, RankingCriteria, ScoringType, ToxicIntensity, Tournament, TournamentHistory } from '../../types';
import { sanitizeFixedTeams } from '../matches/partnerMode';
import { createFreshTournamentDraft } from './tournamentDraft';

// Template match tersimpan (PRD Match Creation v2 §5.1/R1.2). Disimpan lokal
// per akun; roster ikut disimpan supaya sesi mingguan tinggal konfirmasi hadir.
export interface MatchTemplate {
  id: string;
  name: string;
  createdAt: number;
  format: MatchFormat;
  partnerMode: PartnerMode;
  criteria: RankingCriteria;
  scoringType?: ScoringType;
  matchPlayMode?: MatchPlayMode;
  matchPlayGamesTarget?: number;
  matchPlayBestOfSets?: number;
  courts: number;
  totalPoints: number;
  numRounds: number;
  durationMinutes?: number;
  toxicModeEnabled?: boolean;
  toxicIntensity?: ToxicIntensity;
  venueName?: string;
  location?: string;
  players: Player[];
  fixedTeams?: FixedTeam[];
}

// Stats pemain di history membawa hasil match lama — reset supaya draft baru
// mulai bersih, identitas (rating/avatar/inisial) tetap dipakai.
const resetPlayerForDraft = (player: Player): Player => ({
  ...player,
  stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
});

const sanitizeRosterPlayers = (players?: Player[] | null): Player[] => {
  const seen = new Set<string>();
  const roster: Player[] = [];
  (players || []).forEach((player) => {
    if (!player?.id || !player?.name || seen.has(player.id)) return;
    seen.add(player.id);
    roster.push(resetPlayerForDraft(player));
  });
  return roster;
};

const applyQuickStartSettings = (base: Tournament, source: {
  format: MatchFormat;
  partnerMode?: PartnerMode;
  criteria?: RankingCriteria;
  scoringType?: ScoringType;
  matchPlayMode?: MatchPlayMode;
  matchPlayGamesTarget?: number;
  matchPlayBestOfSets?: number;
  courts?: number;
  totalPoints?: number;
  numRounds?: number;
  durationMinutes?: number;
  toxicModeEnabled?: boolean;
  toxicIntensity?: ToxicIntensity;
  venueName?: string;
  location?: string;
  players?: Player[] | null;
  fixedTeams?: FixedTeam[];
}): Tournament => {
  const players = sanitizeRosterPlayers(source.players);
  const partnerMode: PartnerMode = source.partnerMode === 'fixed' ? 'fixed' : 'rotating';
  return {
    ...base,
    format: source.format,
    partnerMode,
    fixedTeams: partnerMode === 'fixed' ? sanitizeFixedTeams(players, source.fixedTeams) : [],
    criteria: source.criteria || base.criteria,
    scoringType: source.scoringType || base.scoringType,
    matchPlayMode: source.matchPlayMode || base.matchPlayMode,
    matchPlayGamesTarget: source.matchPlayGamesTarget ?? base.matchPlayGamesTarget,
    matchPlayBestOfSets: source.matchPlayBestOfSets ?? base.matchPlayBestOfSets,
    courts: Math.max(1, Number(source.courts) || base.courts),
    totalPoints: Math.max(1, Number(source.totalPoints) || base.totalPoints),
    numRounds: Math.max(1, Number(source.numRounds) || base.numRounds),
    durationMinutes: Number(source.durationMinutes) || base.durationMinutes,
    toxicModeEnabled: Boolean(source.toxicModeEnabled),
    toxicIntensity: source.toxicIntensity || base.toxicIntensity,
    venueName: source.venueName || '',
    location: source.location || '',
    players,
  };
};

// R1.1: clone match terakhir jadi draft baru — id/skor/ronde tidak ikut.
export const buildDraftFromHistory = (history: TournamentHistory): Tournament =>
  applyQuickStartSettings(createFreshTournamentDraft(), history);

export const buildDraftFromTemplate = (template: MatchTemplate): Tournament =>
  applyQuickStartSettings(createFreshTournamentDraft(), template);

export const buildTemplateFromSettings = (settings: Tournament, name: string): MatchTemplate => ({
  id: `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  name: name.trim() || `${settings.format} template`,
  createdAt: Date.now(),
  format: settings.format,
  partnerMode: settings.partnerMode === 'fixed' ? 'fixed' : 'rotating',
  criteria: settings.criteria,
  scoringType: settings.scoringType,
  matchPlayMode: settings.matchPlayMode,
  matchPlayGamesTarget: settings.matchPlayGamesTarget,
  matchPlayBestOfSets: settings.matchPlayBestOfSets,
  courts: settings.courts,
  totalPoints: settings.totalPoints,
  numRounds: settings.numRounds,
  durationMinutes: settings.durationMinutes,
  toxicModeEnabled: Boolean(settings.toxicModeEnabled),
  toxicIntensity: settings.toxicIntensity,
  venueName: settings.venueName || '',
  location: settings.location || '',
  players: sanitizeRosterPlayers(settings.players),
  fixedTeams: settings.partnerMode === 'fixed' ? settings.fixedTeams || [] : [],
});

// Label satu baris untuk banner/daftar template:
// "Americano · 2 courts · 8 players"
export const summarizeQuickStartSource = (source: {
  format: MatchFormat;
  courts?: number;
  players?: Player[] | null;
  numPlayers?: number;
}): string => {
  const courts = Math.max(1, Number(source.courts) || 1);
  const playerCount = source.players?.length ?? source.numPlayers ?? 0;
  const parts = [source.format, `${courts} court${courts > 1 ? 's' : ''}`];
  if (playerCount > 0) parts.push(`${playerCount} player${playerCount > 1 ? 's' : ''}`);
  return parts.join(' · ');
};

// Konteks tempat+waktu untuk baris kedua banner: "Star Padel · Fri, Jul 3"
export const describeQuickStartContext = (source: {
  venueName?: string;
  location?: string;
  date?: Date;
}): string => {
  const parts: string[] = [];
  const venue = (source.venueName || source.location || '').trim();
  if (venue) parts.push(venue);
  if (source.date instanceof Date && !Number.isNaN(source.date.getTime())) {
    parts.push(source.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }
  return parts.join(' · ');
};

// History paling baru yang layak di-repeat: punya roster yang bisa dipakai.
export const findRepeatableHistory = (tournaments: TournamentHistory[]): TournamentHistory | null => {
  for (const history of tournaments || []) {
    if (!history) continue;
    if (sanitizeRosterPlayers(history.players).length > 0) return history;
  }
  return null;
};
