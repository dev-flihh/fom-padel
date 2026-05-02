import { useEffect, type MutableRefObject } from 'react';
import {
  getPlayersStorageKey,
  getTournamentHistoryMetaStorageKey,
  getTournamentHistoryStorageKey,
  getTournamentStorageKey,
} from './historyPersistence';
import type { Player, Tournament, TournamentHistory } from '../../types';

type UseLocalTournamentPersistenceParams = {
  userUid: string | null | undefined;
  isSharedViewer: boolean;
  allPlayers: Player[];
  tournament: Tournament;
  tournaments: TournamentHistory[];
  hydratedHistoryCacheRef: MutableRefObject<string | null>;
};

export const useLocalTournamentPersistence = ({
  userUid,
  isSharedViewer,
  allPlayers,
  tournament,
  tournaments,
  hydratedHistoryCacheRef,
}: UseLocalTournamentPersistenceParams) => {
  useEffect(() => {
    if (!userUid || isSharedViewer) return;
    localStorage.setItem(getPlayersStorageKey(userUid), JSON.stringify(allPlayers));
  }, [allPlayers, isSharedViewer, userUid]);

  useEffect(() => {
    if (!userUid || isSharedViewer) return;
    localStorage.setItem(getTournamentStorageKey(userUid), JSON.stringify(tournament));
  }, [isSharedViewer, tournament, userUid]);

  useEffect(() => {
    if (!userUid || isSharedViewer) return;
    try {
      const serializedHistory = JSON.stringify(tournaments);
      localStorage.setItem(getTournamentHistoryStorageKey(userUid), serializedHistory);
      if (hydratedHistoryCacheRef.current === serializedHistory) {
        hydratedHistoryCacheRef.current = null;
        return;
      }
      localStorage.setItem(getTournamentHistoryMetaStorageKey(userUid), JSON.stringify({
        savedAt: Date.now(),
      }));
    } catch (err) {
      console.error('Write local history cache error:', err);
    }
  }, [hydratedHistoryCacheRef, isSharedViewer, tournaments, userUid]);
};
