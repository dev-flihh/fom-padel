import type { FixedTeam, Player, PartnerMode, Tournament, TournamentHistory } from '../../types';

export const getPartnerMode = (
  tournament: Pick<Tournament | TournamentHistory, 'partnerMode'>
): PartnerMode => (tournament.partnerMode === 'fixed' ? 'fixed' : 'rotating');

export const isFixedPartnerTournament = (
  tournament: Pick<Tournament | TournamentHistory, 'partnerMode'>
): boolean => getPartnerMode(tournament) === 'fixed';

// Buang tim yang anggotanya tidak ada di roster, duplikat, atau memasangkan
// pemain dengan dirinya sendiri. Satu pemain hanya boleh ada di satu tim.
export const sanitizeFixedTeams = (
  players: Player[],
  fixedTeams: FixedTeam[] | undefined
): FixedTeam[] => {
  const rosterIds = new Set((players || []).map((player) => player.id));
  const claimedIds = new Set<string>();
  const result: FixedTeam[] = [];

  (fixedTeams || []).forEach((team) => {
    const [firstId, secondId] = team.playerIds || [];
    if (!firstId || !secondId || firstId === secondId) return;
    if (!rosterIds.has(firstId) || !rosterIds.has(secondId)) return;
    if (claimedIds.has(firstId) || claimedIds.has(secondId)) return;
    claimedIds.add(firstId);
    claimedIds.add(secondId);
    result.push({ ...team, playerIds: [firstId, secondId] });
  });

  return result;
};

// Pasangkan pemain berurutan (urutan seleksi) menjadi tim tetap default.
// Pemain sisa (ganjil) tidak dipasangkan — validasi wizard yang menolak.
export const buildAutoFixedTeams = (players: Player[]): FixedTeam[] => {
  const teams: FixedTeam[] = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    teams.push({
      id: `ft-${players[i].id}-${players[i + 1].id}`,
      playerIds: [players[i].id, players[i + 1].id],
    });
  }
  return teams;
};

export const areFixedTeamsEqual = (a: FixedTeam[], b: FixedTeam[]): boolean => (
  a.length === b.length &&
  a.every((team, index) => (
    team.id === b[index].id &&
    team.playerIds[0] === b[index].playerIds[0] &&
    team.playerIds[1] === b[index].playerIds[1] &&
    (team.name || '') === (b[index].name || '')
  ))
);

// Pertahankan tim valid yang sudah dibentuk user, lalu auto-pair pemain yang
// belum punya tim (urut seleksi). Dipanggil tiap daftar pemain berubah.
export const reconcileFixedTeams = (players: Player[], prevTeams: FixedTeam[]): FixedTeam[] => {
  const validTeams = sanitizeFixedTeams(players, prevTeams);
  const claimedIds = new Set(validTeams.flatMap((team) => team.playerIds));
  const unpairedPlayers = players.filter((player) => !claimedIds.has(player.id));
  return [...validTeams, ...buildAutoFixedTeams(unpairedPlayers)];
};

// Tukar posisi dua pemain antar tim (atau dalam tim yang sama — no-op efektif).
export const swapFixedTeamMembers = (
  teams: FixedTeam[],
  playerIdA: string,
  playerIdB: string
): FixedTeam[] => {
  if (playerIdA === playerIdB) return teams;
  return teams.map((team) => ({
    ...team,
    playerIds: team.playerIds.map((id) => {
      if (id === playerIdA) return playerIdB;
      if (id === playerIdB) return playerIdA;
      return id;
    }) as [string, string],
  }));
};

export const getFixedTeamLabel = (team: FixedTeam, players: Player[]): string => {
  if (team.name && team.name.trim()) return team.name.trim();
  const byId = new Map(players.map((player) => [player.id, player]));
  const names = team.playerIds
    .map((id) => byId.get(id)?.name?.split(' ')[0] || '?')
    .join(' & ');
  return names;
};
