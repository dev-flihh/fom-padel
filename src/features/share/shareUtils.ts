import type { Match, Player, Tournament, TournamentHistory } from '../../types';
import { normalizeCourtChanges } from '../history/historyPersistence';
import { stripLargeInlineImages, stripTournamentPlayerAvatars, toFirestoreSafe } from '../../services/firestoreSerialization';

const getShareableInitials = (name = '') => (
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

const toShareablePlayerSnapshot = (player: Player): Player => ({
  id: player.id,
  name: player.name,
  rating: Number.isFinite(Number(player.rating)) ? Number(player.rating) : 0,
  source: player.source,
  initials: player.initials || getShareableInitials(player.name),
  stats: {
    matches: Number(player.stats?.matches || 0),
    won: Number(player.stats?.won || 0),
    lost: Number(player.stats?.lost || 0),
    draw: Number(player.stats?.draw || 0),
    diff: Number(player.stats?.diff || 0),
  },
});

const toShareableMatchSnapshot = (match: Match): Match => ({
  ...match,
  teamA: {
    ...match.teamA,
    players: (match.teamA.players || []).map(toShareablePlayerSnapshot),
  },
  teamB: {
    ...match.teamB,
    players: (match.teamB.players || []).map(toShareablePlayerSnapshot),
  },
});

export const toShareableTournamentSnapshot = (targetTournament: Tournament | TournamentHistory) => {
  const rounds = Array.isArray(targetTournament.rounds) ? targetTournament.rounds : [];
  const isCompletedTournament = Boolean(targetTournament.endedAt);
  const shareableRounds = rounds
    .map((round) => ({
      ...round,
      playersBye: (round.playersBye || []).map(toShareablePlayerSnapshot),
      matches: (round.matches || [])
        .filter((match) => isCompletedTournament || match.status !== 'pending')
        .map(toShareableMatchSnapshot),
    }))
    .filter((round) => round.matches.length > 0);

  return toFirestoreSafe(stripLargeInlineImages(stripTournamentPlayerAvatars({
    ...targetTournament,
    players: (targetTournament.players || []).map(toShareablePlayerSnapshot),
    rounds: shareableRounds,
    courtChanges: normalizeCourtChanges(targetTournament.courtChanges),
  })));
};

const getShareBaseUrl = () => {
  const envPublicUrl = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (envPublicUrl) {
    const normalizedPublicUrl = envPublicUrl.startsWith('http://') || envPublicUrl.startsWith('https://')
      ? envPublicUrl
      : `https://${envPublicUrl}`;
    const shareBaseUrl = new URL(normalizedPublicUrl);
    shareBaseUrl.pathname = '/';
    shareBaseUrl.search = '';
    shareBaseUrl.hash = '';
    return shareBaseUrl.toString();
  }
  return `${window.location.origin}/`;
};

// Friendly, human-readable share links: /m/<id> for the live match and
// /m/<id>/klasemen for standings. Old ?shared= links keep resolving via
// parseSharedMatchPath's query-string fallback, so this is safe to switch.
export const buildShareUrl = (shareId: string, view: 'active' | 'klasemen') => {
  try {
    const shareUrl = new URL(getShareBaseUrl());
    shareUrl.pathname = `/m/${encodeURIComponent(shareId)}${view === 'klasemen' ? '/klasemen' : ''}`;
    shareUrl.search = '';
    shareUrl.hash = '';

    const isLocalHost = ['localhost', '127.0.0.1'].includes(shareUrl.hostname);
    const envNetworkHost = ((import.meta as any).env?.VITE_SHARE_NETWORK_HOST as string | undefined)?.trim() || '';
    let savedNetworkHost = '';
    try {
      savedNetworkHost = localStorage.getItem('fom_share_network_host') || '';
    } catch {
      savedNetworkHost = '';
    }
    const networkHost = (envNetworkHost || savedNetworkHost).trim();

    if (isLocalHost && networkHost) {
      shareUrl.hostname = networkHost;
      shareUrl.protocol = 'http:';
    }

    return shareUrl.toString();
  } catch {
    return `${window.location.origin}/m/${encodeURIComponent(shareId)}${view === 'klasemen' ? '/klasemen' : ''}`;
  }
};
