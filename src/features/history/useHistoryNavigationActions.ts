import type { Dispatch, SetStateAction } from 'react';
import type { Screen, Tournament, TournamentHistory } from '../../types';
import { buildReadOnlyTournamentFromHistory } from './historyDetailUtils';
import { hydrateTournamentHistoryDetail } from './hydrateTournamentHistoryDetail';

type RecordDbMetric = (record: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type RecordDbError = (record: {
  flow: string;
  label?: string;
  err: unknown;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type KlasemenBackScreen = 'dashboard' | 'active' | 'history-detail';
type ActiveBackScreen = 'dashboard' | 'history-detail' | 'klasemen' | 'history' | 'profile';
type HistoryBackScreen = 'dashboard' | 'history' | 'profile';

type Params = {
  tournament: Tournament;
  selectedHistory: TournamentHistory | null;
  selectedKlasemenTournament: Tournament | TournamentHistory | null;
  activeScreenTournament: Tournament | null;
  klasemenBackScreen: KlasemenBackScreen;
  isSharedViewer: boolean;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setSelectedHistory: Dispatch<SetStateAction<TournamentHistory | null>>;
  setSelectedKlasemenTournament: Dispatch<SetStateAction<Tournament | TournamentHistory | null>>;
  setKlasemenBackScreen: Dispatch<SetStateAction<KlasemenBackScreen>>;
  setActiveScreenTournament: Dispatch<SetStateAction<Tournament | null>>;
  setActiveBackScreen: Dispatch<SetStateAction<ActiveBackScreen>>;
  setHistoryBackScreen: Dispatch<SetStateAction<HistoryBackScreen>>;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  isFirestoreSaverModeEnabled: () => boolean;
  readTournamentDetailRow: (id: string) => Promise<{ exists: boolean; data?: Record<string, unknown> | null }>;
  readLegacyTournamentRow: (id: string) => Promise<{ exists: boolean; data?: Record<string, unknown> | null }>;
  normalizeHistoryTournament: (history: TournamentHistory) => TournamentHistory;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
};

export const useHistoryNavigationActions = ({
  tournament,
  selectedHistory,
  selectedKlasemenTournament,
  activeScreenTournament,
  klasemenBackScreen,
  isSharedViewer,
  setScreen,
  setSelectedHistory,
  setSelectedKlasemenTournament,
  setKlasemenBackScreen,
  setActiveScreenTournament,
  setActiveBackScreen,
  setHistoryBackScreen,
  setTournaments,
  isFirestoreSaverModeEnabled,
  readTournamentDetailRow,
  readLegacyTournamentRow,
  normalizeHistoryTournament,
  recordDbMetric,
  recordDbError,
}: Params) => {
  const handleOpenLiveStandings = () => {
    setSelectedKlasemenTournament(activeScreenTournament || tournament);
    setKlasemenBackScreen('active');
    setScreen('klasemen');
  };

  const handleOpenHistoryFinalStandings = () => {
    if (!selectedHistory) return;
    setSelectedKlasemenTournament(selectedHistory);
    setKlasemenBackScreen('history-detail');
    setScreen('klasemen');
  };

  const handleOpenHistoryMatchDetails = () => {
    if (!selectedHistory) return;
    setActiveScreenTournament(buildReadOnlyTournamentFromHistory(selectedHistory));
    setActiveBackScreen('history-detail');
    setScreen('active');
  };

  const handleOpenHistoryTournament = async (
    history: TournamentHistory,
    backScreen: HistoryBackScreen
  ) => {
    setHistoryBackScreen(backScreen);
    setSelectedHistory(history);
    setScreen('history-detail');
    const detailedHistory = await hydrateTournamentHistoryDetail({
      history,
      isFirestoreSaverModeEnabled,
      readTournamentDetailRow,
      readLegacyTournamentRow,
      normalizeHistoryTournament,
      recordDbMetric,
      recordDbError,
    });
    setSelectedHistory(detailedHistory);
    setTournaments((prev) => prev.map((item) => (
      item.id === detailedHistory.id ? detailedHistory : item
    )));
  };

  const handleOpenActiveFromStandings = () => {
    const standingsTournament = selectedKlasemenTournament || tournament;
    if (isSharedViewer) {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if (klasemenBackScreen === 'active') {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if ('numPlayers' in standingsTournament) {
      setActiveScreenTournament(buildReadOnlyTournamentFromHistory(standingsTournament as TournamentHistory));
    } else {
      setActiveScreenTournament(null);
    }
    setActiveBackScreen('klasemen');
    setScreen('active');
  };

  return {
    handleOpenLiveStandings,
    handleOpenHistoryFinalStandings,
    handleOpenHistoryMatchDetails,
    handleOpenHistoryTournament,
    handleOpenActiveFromStandings,
  };
};
