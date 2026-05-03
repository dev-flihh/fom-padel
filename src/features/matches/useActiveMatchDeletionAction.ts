import type { Dispatch, SetStateAction } from 'react';
import { createFreshTournamentDraft } from '../tournaments/tournamentDraft';
import type { Screen, Tournament, TournamentHistory } from '../../types';

type AddNotification = (
  title: string,
  message: string,
  type: 'match' | 'tournament' | 'system' | 'achievement',
  tone?: 'info' | 'success' | 'error' | 'achievement'
) => void;

type ActiveBackScreen = 'dashboard' | 'history-detail' | 'klasemen' | 'history' | 'profile';
type ActiveSaveState = 'saved' | 'saving' | 'error';

type Params = {
  tournament: Tournament;
  sharedMatchId: string | null;
  userUid?: string | null;
  isSharedViewer: boolean;
  firebaseDeleteTournamentHistory: (tournamentId: string) => Promise<void>;
  deleteSharedMatch: (shareId: string) => Promise<void>;
  clearActiveTournamentSnapshot: () => Promise<void>;
  clearTournamentStatsSyncWatch: () => void;
  resetTournamentStatsSync: () => void;
  getTournamentStorageKey: (uid: string) => string;
  getTournamentShareStorageKey: (uid: string, startedAt: number) => string;
  addNotification: AddNotification;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  setSelectedHistory: Dispatch<SetStateAction<TournamentHistory | null>>;
  setDraftMatchBackgroundId: Dispatch<SetStateAction<string | null>>;
  setNeedsRegenerateFromRound: Dispatch<SetStateAction<number | null>>;
  setSharedMatchId: Dispatch<SetStateAction<string | null>>;
  setSelectedKlasemenTournament: Dispatch<SetStateAction<Tournament | TournamentHistory | null>>;
  setActiveScreenTournament: Dispatch<SetStateAction<Tournament | null>>;
  setActiveBackScreen: Dispatch<SetStateAction<ActiveBackScreen>>;
  setActiveSaveState: Dispatch<SetStateAction<ActiveSaveState>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
};

export const useActiveMatchDeletionAction = ({
  tournament,
  sharedMatchId,
  userUid,
  isSharedViewer,
  firebaseDeleteTournamentHistory,
  deleteSharedMatch,
  clearActiveTournamentSnapshot,
  clearTournamentStatsSyncWatch,
  resetTournamentStatsSync,
  getTournamentStorageKey,
  getTournamentShareStorageKey,
  addNotification,
  setTournaments,
  setSelectedHistory,
  setDraftMatchBackgroundId,
  setNeedsRegenerateFromRound,
  setSharedMatchId,
  setSelectedKlasemenTournament,
  setActiveScreenTournament,
  setActiveBackScreen,
  setActiveSaveState,
  setTournament,
  setScreen,
}: Params) => {
  const handleDeleteActiveMatch = async () => {
    const deletedTournamentName = (tournament.name || '').trim() || 'Match';
    const activeTournamentStartedAt = tournament.startedAt;
    const currentSharedMatchId = sharedMatchId;
    const finalizedTournamentId = typeof tournament.id === 'string' ? tournament.id.trim() : '';
    const shouldDeleteFinalizedHistory = Boolean(
      finalizedTournamentId &&
      tournament.endedAt &&
      userUid &&
      !isSharedViewer
    );

    if (shouldDeleteFinalizedHistory) {
      try {
        await firebaseDeleteTournamentHistory(finalizedTournamentId);
        setTournaments((prev) => prev.filter((item) => item.id !== finalizedTournamentId));
        setSelectedHistory((prev) => (prev?.id === finalizedTournamentId ? null : prev));
      } catch (err) {
        console.error('Delete tournament history error:', err);
        addNotification(
          'Hapus Gagal',
          'Riwayat pertandingan dan statistik pemain belum berhasil dihapus. Coba lagi.',
          'system',
          'error'
        );
        return;
      }
    }

    setDraftMatchBackgroundId(null);
    setNeedsRegenerateFromRound(null);
    setSharedMatchId(null);
    setSelectedKlasemenTournament(null);
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setActiveSaveState('saved');
    clearTournamentStatsSyncWatch();
    resetTournamentStatsSync();
    setTournament(createFreshTournamentDraft());
    setScreen('dashboard');

    if (userUid) {
      localStorage.removeItem(getTournamentStorageKey(userUid));
      if (activeTournamentStartedAt) {
        localStorage.removeItem(getTournamentShareStorageKey(userUid, activeTournamentStartedAt));
      }
    }

    if (userUid && !isSharedViewer) {
      try {
        await clearActiveTournamentSnapshot();
      } catch (err) {
        console.error('Delete active match sync error:', err);
      }
    }

    if (currentSharedMatchId && userUid && !isSharedViewer) {
      try {
        await deleteSharedMatch(currentSharedMatchId);
      } catch (err) {
        console.error('Delete shared match error:', err);
      }
    }

    addNotification(
      'Pertandingan Dihapus',
      shouldDeleteFinalizedHistory
        ? `${deletedTournamentName} berhasil dihapus, termasuk riwayat pertandingan dan rollback statistik pemain.`
        : `${deletedTournamentName} berhasil dihapus dari match aktif.`,
      'system'
    );
  };

  return { handleDeleteActiveMatch };
};
