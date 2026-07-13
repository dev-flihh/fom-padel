import type { Friend, Match, Player, RankingCriteria, Tournament, TournamentHistory } from '../../types';

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
  // Match Play bestOf: score = set dimenangkan, game set berjalan ada di sets[].
  const hasGamesInSets = [...(match.teamA?.sets || []), ...(match.teamB?.sets || [])]
    .some((games) => Number(games) > 0);
  return match.status === 'completed' || scoreA > 0 || scoreB > 0 || hasPointScore || hasGamesInSets;
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

      // Match completed tanpa skor sama sekali (mis. ronde ditutup paksa
      // sebelum ada game/poin masuk) bukan hasil imbang — jangan dihitung
      // sebagai draw untuk keempat pemainnya.
      const isScorelessCompleted = match.status === 'completed' && scoreA === 0 && scoreB === 0;

      match.teamA.players.forEach((player) => {
        const stats = playerStatsMap[player.id];
        if (!stats) return;
        if (shouldCountStandingScore) {
          stats.totalPoints += scoreA;
          stats.pointsDiff += scoreA - scoreB;
        }
        if (match.status === 'completed' && !isScorelessCompleted) {
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
        if (match.status === 'completed' && !isScorelessCompleted) {
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
    players: Object.values(playerStatsMap).sort((a, b) => compareStandingsPlayers(a, b, tournament.criteria)),
  };
};

// Urutan klasemen mengikuti criteria match: 'Points Won' menimbang total poin
// dulu (sesuai copy wizard "Ranks players by total points"), selain itu
// jumlah kemenangan dulu (perilaku lama, juga default data tanpa criteria).
export const compareStandingsPlayers = (
  a: StandingsPlayer,
  b: StandingsPlayer,
  criteria?: RankingCriteria
) => {
  if (criteria === 'Points Won') {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    if (b.w !== a.w) return b.w - a.w;
  } else {
    if (b.w !== a.w) return b.w - a.w;
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  }
  return a.name.localeCompare(b.name, 'id-ID');
};

// Pasangan efektif untuk klasemen mode fixed: diturunkan dari rounds
// (pasangan yang paling sering benar-benar main bareng), karena fixedTeams
// tersimpan bisa basi / tidak sinkron dengan lapangan (mis. hasil edit setup
// atau bug swap lama). Fallback ke fixedTeams saat belum ada ronde.
const deriveEffectiveFixedTeams = (
  tournament: Tournament | TournamentHistory
): Array<{ playerIds: string[] }> => {
  const stored = (tournament.fixedTeams || []).filter((team) => (team.playerIds || []).length >= 2);
  const pairCounts = new Map<string, { ids: [string, string]; count: number }>();
  (tournament.rounds || []).forEach((round) => {
    (round.matches || []).forEach((match) => {
      [match.teamA, match.teamB].forEach((side) => {
        const sidePlayers = side?.players || [];
        for (let i = 0; i < sidePlayers.length; i += 1) {
          for (let j = i + 1; j < sidePlayers.length; j += 1) {
            const idA = sidePlayers[i]?.id;
            const idB = sidePlayers[j]?.id;
            if (!idA || !idB || idA === idB) continue;
            const ids = [idA, idB].sort() as [string, string];
            const key = ids.join('|');
            const record = pairCounts.get(key) || { ids, count: 0 };
            record.count += 1;
            pairCounts.set(key, record);
          }
        }
      });
    });
  });
  if (pairCounts.size === 0) return stored;

  // Urutan anggota mengikuti urutan roster supaya nama tim stabil.
  const rosterIndexById = new Map((tournament.players || []).map((player, index) => [player.id, index]));
  const orderPair = (ids: [string, string]): string[] => {
    const indexA = rosterIndexById.get(ids[0]) ?? Number.MAX_SAFE_INTEGER;
    const indexB = rosterIndexById.get(ids[1]) ?? Number.MAX_SAFE_INTEGER;
    return indexA <= indexB ? [ids[0], ids[1]] : [ids[1], ids[0]];
  };

  // Seri jumlah kemunculan (mis. anchor lama vs baru sama-sama 1 ronde
  // setelah swap) dimenangkan pasangan yang tercatat di fixedTeams tersimpan
  // — itu deklarasi pairing terkini (swap ikut meng-update-nya).
  const storedPairKeys = new Set(
    stored
      .map((team) => [...(team.playerIds || [])].sort().join('|'))
      .filter(Boolean)
  );
  const claimed = new Set<string>();
  const derived: Array<{ playerIds: string[] }> = [];
  [...pairCounts.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const aStored = storedPairKeys.has(a.ids.join('|')) ? 1 : 0;
      const bStored = storedPairKeys.has(b.ids.join('|')) ? 1 : 0;
      return bStored - aStored;
    })
    .forEach(({ ids }) => {
      if (claimed.has(ids[0]) || claimed.has(ids[1])) return;
      claimed.add(ids[0]);
      claimed.add(ids[1]);
      derived.push({ playerIds: orderPair(ids) });
    });
  // Tim tersimpan yang belum pernah main (kedua anggota belum terpakai)
  // tetap dipertahankan.
  stored.forEach((team) => {
    const [idA, idB] = team.playerIds || [];
    if (!idA || !idB || claimed.has(idA) || claimed.has(idB)) return;
    claimed.add(idA);
    claimed.add(idB);
    derived.push({ playerIds: [idA, idB] });
  });
  return derived;
};

// Klasemen tim untuk partnerMode 'fixed': satu baris per pasangan tetap.
// Stats tim dihitung langsung dari rounds (bukan disalin dari stats individu
// anchor) supaya tetap akurat setelah pemain di-swap di tengah match: sisi
// match diatribusikan ke tim yang anggotanya (saat ini) paling banyak ikut
// bermain di sisi itu, jadi poin ronde lama tetap milik slot tim tersebut.
export const buildOfficialTeamStandings = ({
  tournament,
  officialStandings,
}: {
  tournament: Tournament | TournamentHistory;
  officialStandings: OfficialStandingsData;
}): OfficialStandingsData => {
  const fixedTeams = deriveEffectiveFixedTeams(tournament);
  if (fixedTeams.length === 0) return officialStandings;

  const playerById = new Map(officialStandings.players.map((player) => [player.id, player]));
  const claimedIds = new Set<string>();
  const teamRows: StandingsPlayer[] = [];

  const teamIndexByMemberId = new Map<string, number>();
  fixedTeams.forEach((team, teamIndex) => {
    (team.playerIds || []).forEach((playerId) => {
      if (playerId) teamIndexByMemberId.set(playerId, teamIndex);
    });
  });

  type TeamAggregate = { matches: number; w: number; l: number; d: number; pointsDiff: number; totalPoints: number };
  const statsByTeamIndex = new Map<number, TeamAggregate>();
  const getTeamAggregate = (teamIndex: number): TeamAggregate => {
    const existing = statsByTeamIndex.get(teamIndex);
    if (existing) return existing;
    const created: TeamAggregate = { matches: 0, w: 0, l: 0, d: 0, pointsDiff: 0, totalPoints: 0 };
    statsByTeamIndex.set(teamIndex, created);
    return created;
  };

  const attributeSideToTeam = (sidePlayers: Array<{ id: string }>) => {
    const memberCounts = new Map<number, number>();
    sidePlayers.forEach((player) => {
      const teamIndex = teamIndexByMemberId.get(player.id);
      if (teamIndex === undefined) return;
      memberCounts.set(teamIndex, (memberCounts.get(teamIndex) || 0) + 1);
    });
    let bestTeamIndex: number | null = null;
    let bestCount = 0;
    memberCounts.forEach((count, teamIndex) => {
      if (count > bestCount) {
        bestTeamIndex = teamIndex;
        bestCount = count;
      }
    });
    return bestTeamIndex;
  };

  // Pemain yang sudah di-swap keluar dari tim: seluruh penampilannya sudah
  // teratribusi ke baris tim, jadi jangan tampil lagi sebagai baris individu
  // nyasar (poinnya bakal terlihat dobel). Pemain di sisi yang TIDAK
  // teratribusi ke tim mana pun tetap tampil individual sebagai pengaman.
  const attributedSidePlayerIds = new Set<string>();
  const unattributedSidePlayerIds = new Set<string>();

  if (officialStandings.hasCountableScore) {
    (tournament.rounds || []).forEach((round) => {
      (round.matches || []).forEach((match) => {
        const scoreA = Number(match.teamA?.score || 0);
        const scoreB = Number(match.teamB?.score || 0);
        const hasLiveScore = scoreA > 0 || scoreB > 0;
        const shouldCountStandingScore = match.status === 'completed' || hasLiveScore;
        if (!shouldCountStandingScore) return;

        ([
          [match.teamA?.players || [], scoreA, scoreB],
          [match.teamB?.players || [], scoreB, scoreA],
        ] as const).forEach(([sidePlayers, scoreFor, scoreAgainst]) => {
          const teamIndex = attributeSideToTeam(sidePlayers);
          if (teamIndex === null) {
            sidePlayers.forEach((player) => unattributedSidePlayerIds.add(player.id));
            return;
          }
          sidePlayers.forEach((player) => attributedSidePlayerIds.add(player.id));
          const aggregate = getTeamAggregate(teamIndex);
          aggregate.totalPoints += scoreFor;
          aggregate.pointsDiff += scoreFor - scoreAgainst;
          // Selaras dengan klasemen individu: completed 0-0 tidak dihitung draw.
          if (match.status === 'completed' && (scoreFor > 0 || scoreAgainst > 0)) {
            if (scoreFor > scoreAgainst) aggregate.w += 1;
            else if (scoreFor < scoreAgainst) aggregate.l += 1;
            else aggregate.d += 1;
          }
        });
      });
    });
    statsByTeamIndex.forEach((aggregate) => {
      aggregate.matches = aggregate.w + aggregate.l + aggregate.d;
    });
  }

  fixedTeams.forEach((team, teamIndex) => {
    const [firstId, secondId] = team.playerIds || [];
    const first = firstId ? playerById.get(firstId) : undefined;
    const second = secondId ? playerById.get(secondId) : undefined;
    if (!first || !second || first.id === second.id) return;
    claimedIds.add(first.id);
    claimedIds.add(second.id);
    const anchor = first;
    const partner = second;
    const aggregate = statsByTeamIndex.get(teamIndex);
    teamRows.push({
      ...anchor,
      ...(aggregate || { matches: 0, w: 0, l: 0, d: 0, pointsDiff: 0, totalPoints: 0 }),
      name: `${anchor.name} & ${partner.name}`,
      isTeamRow: true,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerAvatar: partner.avatar,
      partnerInitials: partner.initials,
    });
  });

  // Pemain tanpa tim (edge: data lama / roster berubah) tetap tampil
  // individual — kecuali bekas anggota tim yang seluruh penampilannya sudah
  // terhitung di baris tim (hasil swap), itu disembunyikan.
  const leftoverPlayers = officialStandings.players.filter((player) => {
    if (claimedIds.has(player.id)) return false;
    const onlyPlayedAsTeamSubstitute = attributedSidePlayerIds.has(player.id) && !unattributedSidePlayerIds.has(player.id);
    return !onlyPlayedAsTeamSubstitute;
  });

  return {
    hasCountableScore: officialStandings.hasCountableScore,
    players: [...teamRows, ...leftoverPlayers].sort((a, b) => compareStandingsPlayers(a, b, tournament.criteria)),
  };
};
