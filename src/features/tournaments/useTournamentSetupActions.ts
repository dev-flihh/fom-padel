import type { Dispatch, SetStateAction } from 'react';
import { getRandomMatchBackground } from '../matches/matchBackgrounds';
import { generateTournamentFromSettings } from './generateTournament';
import { sanitizeInactivePlayerIds } from './tournamentDraft';
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
    const nextTournament = generateTournamentFromSettings(settings);

    setSharedMatchId(null);
    setTournament(nextTournament);
    setDraftMatchBackgroundId(settings.backgroundId || null);
    setNeedsRegenerateFromRound(null);
    void persistActiveTournamentSnapshot(nextTournament);
    if (settings.backgroundId) {
      setActiveScreenTournament(null);
      setActiveBackScreen('dashboard');
      setScreen('active');
    } else {
      setScreen('background-picker');
    }
    addNotification('Matches Started!', `${settings.name} has been created with ${settings.players.length} players.`, 'tournament');
  };

  const handleSkipMatchBackground = () => {
    const randomBackgroundId = getRandomMatchBackground(tournament.format);
    setDraftMatchBackgroundId(randomBackgroundId);
    setTournament((prev) => ({
      ...prev,
      backgroundId: randomBackgroundId,
    }));
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setScreen('active');
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
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds),
          }
        : nextTournament
    );

    setTournament(persistedTournament);

    addNotification(
      'New Player Added',
      `${newPlayer.name} akan ikut mulai ronde berikutnya.`,
      'system'
    );
  };

  return {
    handleGenerateTournament,
    handleSkipMatchBackground,
    handleAddPlayerDuringActiveMatch,
  };
};
