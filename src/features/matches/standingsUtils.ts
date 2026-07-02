import type { Friend, Match, Player, Tournament, TournamentHistory } from '../../types';

export type StandingsPlayer = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  matches: number;
  w: number;
  l: number;
  d: number;
  pointsDiff: number;
  totalPoints: number;
  // Diisi hanya pada baris tim (partnerMode 'fixed'): identitas pasangan dari
  // pemain anchor. Stats baris = stats tim (anggota selalu main bersama).
  isTeamRow?: boolean;
  partnerId?: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerInitials?: string;
};

export type OfficialStandingsData = {
  hasCountableScore: boolean;
  players: StandingsPlayer[];
};

export const hasMatchScoreProgress = (match: Match) => {
  const scoreA = Number(match.teamA?.score || 0);
  const scoreB = Number(match.teamB?.score || 0);
  const hasPointScore = (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
  return match.status === 'completed' || scoreA > 0 || scoreB > 0 || hasPointScore;
};

const getInitials = (name = '') => (
  name
    .split(' ')
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

export const buildOfficialStandings = ({
  tournament,
  friends,
  currentUserUid,
  currentUserDisplayName,
  currentUserEmail,
  currentUserPhotoURL,
}: {
  tournament: Tournament | TournamentHistory;
  friends?: Friend[];
  currentUserUid?: string;
  currentUserDisplayName?: string;
  currentUserEmail?: string;
  currentUserPhotoURL?: string;
}): OfficialStandingsData => {
  const tournamentPlayers = tournament.players || [];
  const tournamentRounds = tournament.rounds || [];
  const safeCurrentUserUid = String(currentUserUid || '').trim();
  const safeCurrentUserPhotoURL = String(currentUserPhotoURL || '').trim();
  const currentUserName = String(
    currentUserDisplayName ||
    (currentUserEmail ? currentUserEmail.split('@')[0] : '') ||
    ''
  ).trim();
  const hasCountableScore = tournamentRounds.some((round) => (
    (round.matches || []).some(hasMatchScoreProgress)
  ));

  const playerRegistry = new Map<string, Player>();
  const friendById = new Map<string, Friend>(
    (friends || [])
      .filter((friend) => String(friend?.uid || '').trim())
      .map((friend) => [String(friend.uid).trim(), friend])
  );
  const registerPlayer = (player: Player | undefined) => {
    if (!player) return;
    const isCurrentUserPlayer = Boolean(safeCurrentUserUid) && player.id === safeCurrentUserUid;
    const friendProfile = friendById.get(player.id);
    const liveName = isCurrentUserPlayer ? currentUserName : (friendProfile?.displayName || '');
    const liveAvatar = isCurrentUserPlayer ? safeCurrentUserPhotoURL : (friendProfile?.photoURL || '');
    const normalizedPlayer = {
      ...player,
      name: liveName || player.name,
      avatar: liveAvatar || player.avatar || '',
    };
    const existing = playerRegistry.get(player.id);
    if (!existing) {
      playerRegistry.set(player.id, normalizedPlayer);
      return;
    }
    playerRegistry.set(player.id, {
      ...existing,
      ...normalizedPlayer,
      avatar: normalizedPlayer.avatar || existing.avatar,
      initials: normalizedPlayer.initials || existing.initials,
    });
  };

  tournamentPlayers.forEach(registerPlayer);
  tournamentRounds.forEach((round) => {
    round.matches.forEach((match) => {
      match.teamA.players.forEach(registerPlayer);
      match.teamB.players.forEach(registerPlayer);
    });
    (round.playersBye || []).forEach(registerPlayer);
  });

  const playerStatsMap: Record<string, StandingsPlayer> = {};

  playerRegistry.forEach((player) => {
    playerStatsMap[player.id] = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      initials: player.initials || getInitials(player.name),
      matches: 0,
      w: 0,
      l: 0,
      d: 0,
      pointsDiff: 0,
      totalPoints: 0,
    };
  });

  tournamentRounds.forEach((round) => {
    round.matches.forEach((match) => {
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const hasLiveScore = scoreA > 0 || scoreB > 0;
      const shouldCountStandingScore = match.status === 'completed' || hasLiveScore;
      if (!shouldCountStandingScore && match.status !== 'completed') return;

      match.teamA.players.forEach((player) => {
        const stats = playerStatsMap[player.id];
        if (!stats) return;
        if (shouldCountStandingScore) {
          stats.totalPoints += scoreA;
          stats.pointsDiff += scoreA - scoreB;
        }
        if (match.status === 'completed') {
          if (scoreA > scoreB) stats.w += 1;
          else if (scoreA < scoreB) stats.l += 1;
          else stats.d += 1;
        }
      });

      match.teamB.players.forEach((player) => {
        const stats = playerStatsMap[player.id];
        if (!stats) return;
        if (shouldCountStandingScore) {
          stats.totalPoints += scoreB;
          stats.pointsDiff += scoreB - scoreA;
        }
        if (match.status === 'completed') {
          if (scoreB > scoreA) stats.w += 1;
          else if (scoreB < scoreA) stats.l += 1;
          else stats.d += 1;
        }
      });
    });
  });

  if (!hasCountableScore) {
    playerRegistry.forEach((player) => {
      const stats = playerStatsMap[player.id];
      if (!stats) return;
      stats.matches = Number(player.stats?.matches || 0);
      stats.w = Number(player.stats?.won || 0);
      stats.l = Number(player.stats?.lost || 0);
      stats.d = Number(player.stats?.draw || 0);
      stats.pointsDiff = Number(player.stats?.diff || 0);
      stats.totalPoints = Number((player as Player & { totalPoints?: number }).totalPoints || 0);
    });
  } else {
    Object.values(playerStatsMap).forEach((stats) => {
      stats.matches = stats.w + stats.l + stats.d;
    });
  }

  return {
    hasCountableScore,
    players: Object.values(playerStatsMap).sort(compareStandingsPlayers),
  };
};

export const compareStandingsPlayers = (a: StandingsPlayer, b: StandingsPlayer) => {
  if (b.w !== a.w) return b.w - a.w;
  if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  return a.name.localeCompare(b.name, 'id-ID');
};

// Klasemen tim untuk partnerMode 'fixed': satu baris per pasangan tetap.
// Stats diambil dari anggota dengan jumlah match terbanyak (stats individunya
// identik dengan stats tim karena mereka selalu main bersama); id baris tetap
// id pemain anchor supaya round history & expand existing tetap jalan.
export const buildOfficialTeamStandings = ({
  tournament,
  officialStandings,
}: {
  tournament: Tournament | TournamentHistory;
  officialStandings: OfficialStandingsData;
}): OfficialStandingsData => {
  const fixedTeams = tournament.fixedTeams || [];
  if (fixedTeams.length === 0) return officialStandings;

  const playerById = new Map(officialStandings.players.map((player) => [player.id, player]));
  const claimedIds = new Set<string>();
  const teamRows: StandingsPlayer[] = [];

  fixedTeams.forEach((team) => {
    const [firstId, secondId] = team.playerIds || [];
    const first = firstId ? playerById.get(firstId) : undefined;
    const second = secondId ? playerById.get(secondId) : undefined;
    if (!first || !second || first.id === second.id) return;
    claimedIds.add(first.id);
    claimedIds.add(second.id);
    const anchor = second.matches > first.matches ? second : first;
    const partner = anchor === first ? second : first;
    teamRows.push({
      ...anchor,
      name: `${anchor.name} & ${partner.name}`,
      isTeamRow: true,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerAvatar: partner.avatar,
      partnerInitials: partner.initials,
    });
  });

  // Pemain tanpa tim (edge: data lama / roster berubah) tetap tampil individual.
  const leftoverPlayers = officialStandings.players.filter((player) => !claimedIds.has(player.id));

  return {
    hasCountableScore: officialStandings.hasCountableScore,
    players: [...teamRows, ...leftoverPlayers].sort(compareStandingsPlayers),
  };
};
