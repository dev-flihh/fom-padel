import type { Dispatch, SetStateAction } from 'react';
import { getRandomMatchBackground } from '../matches/matchBackgrounds';
import { generateTournamentFromSettings } from './generateTournament';
import { sanitizeInactivePlayerIds } from './tournamentDraft';
import { getPartnerMode } from '../matches/partnerMode';
import type { Player, Screen, Tournament } from '../../types';

type AddNotification = (
  title: string,
  message: string,
  type: 'match' | 'tournament' | 'system' | 'achievement',
  tone?: 'info' | 'success' | 'error' | 'achievement'
) => void;

type ActiveBackScreen = 'dashboard' | 'history-detail' | 'klasemen' | 'history' | 'profile';

type Params = {
  tournament: Tournament;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setSharedMatchId: Dispatch<SetStateAction<string | null>>;
  setDraftMatchBackgroundId: Dispatch<SetStateAction<string | null>>;
  setNeedsRegenerateFromRound: Dispatch<SetStateAction<number | null>>;
  setActiveScreenTournament: Dispatch<SetStateAction<Tournament | null>>;
  setActiveBackScreen: Dispatch<SetStateAction<ActiveBackScreen>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  persistActiveTournamentSnapshot: (nextTournament: Tournament) => Promise<void>;
  addNotification: AddNotification;
  rebuildAmericanoFutureRounds: (baseTournament: Tournament, totalRounds: number) => Tournament['rounds'];
};

export const useTournamentSetupActions = ({
  tournament,
  setTournament,
  setAllPlayers,
  setSharedMatchId,
  setDraftMatchBackgroundId,
  setNeedsRegenerateFromRound,
  setActiveScreenTournament,
  setActiveBackScreen,
  setScreen,
  persistActiveTournamentSnapshot,
  addNotification,
  rebuildAmericanoFutureRounds,
}: Params) => {
  const handleGenerateTournament = (settings: Tournament) => {
    // Appearance step dihapus: background per-match tidak lagi dipilih user,
    // fallback ke default acak per format supaya layar live tetap punya backdrop.
    const backgroundId = settings.backgroundId || getRandomMatchBackground(settings.format);
    const nextTournament = generateTournamentFromSettings({ ...settings, backgroundId });

    setSharedMatchId(null);
    setTournament(nextTournament);
    setDraftMatchBackgroundId(backgroundId);
    setNeedsRegenerateFromRound(null);
    void persistActiveTournamentSnapshot(nextTournament);
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setScreen('active');
    addNotification('Matches Started!', `${settings.name} has been created with ${settings.players.length} players.`, 'tournament');
  };

  const handleAddPlayerDuringActiveMatch = (newPlayer: Player) => {
    setAllPlayers((prev) => {
      const exists = prev.some((player) => player.id === newPlayer.id);
      return exists ? prev : [newPlayer, ...prev];
    });

    const existsInTournament = (tournament.players || []).some((player) => player.id === newPlayer.id);
    if (existsInTournament) return;

    const nextPlayers = [...(tournament.players || []), newPlayer];
    const sanitizedInactive = sanitizeInactivePlayerIds(nextPlayers, tournament.inactivePlayerIds);
    const nextTournament: Tournament = {
      ...tournament,
      players: nextPlayers,
      inactivePlayerIds: sanitizedInactive,
    };
    const isFixedPartner = getPartnerMode(tournament) === 'fixed';
    // Mode fix partner: pemain baru belum punya tim, jadi tidak memengaruhi
    // jadwal — dia jadi bye sampai host memasangkannya lewat ganti pemain.
    const persistedTournament = (
      !isFixedPartner && tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds),
          }
        : nextTournament
    );

    setTournament(persistedTournament);

    addNotification(
      'New Player Added',
      isFixedPartner
        ? `${newPlayer.name} masuk daftar tanpa tim. Pakai ganti pemain untuk memasangkannya ke tim.`
        : `${newPlayer.name} akan ikut mulai ronde berikutnya.`,
      'system'
    );
  };

  return {
    handleGenerateTournament,
    handleAddPlayerDuringActiveMatch,
  };
};
