import type { Dispatch, SetStateAction } from 'react';
import { auth } from '../../firebase';
import { withTimeout } from '../auth/authUtils';
import { getTournamentShareStorageKey, SHARE_WRITE_TIMEOUT_MS } from '../history/historyPersistence';
import { saveSharedMatch } from '../../services/sharedMatchRepository';
import { SHARED_MATCHES_COLLECTION } from '../../services/firestoreCollections';
import type { Tournament, TournamentHistory } from '../../types';

type ShareDeliveryResult = 'copied' | 'shared' | 'manual' | 'failed';

type RecordDbMetric = (input: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type RecordDbError = (input: {
  flow: string;
  label?: string;
  err: unknown;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type UseShareActionsParams = {
  userUid: string | null | undefined;
  tournament: Tournament;
  isSharedViewer: boolean;
  sharedMatchId: string | null;
  setSharedMatchId: Dispatch<SetStateAction<string | null>>;
  setLinkedShareIds: Dispatch<SetStateAction<string[]>>;
  addNotification: (title: string, message: string, type: 'match' | 'tournament' | 'system' | 'achievement', tone?: 'info' | 'success' | 'error' | 'achievement') => void;
  showShareFeedbackToast: (state: 'success' | 'ready' | 'failed', message?: string) => void;
  showShareCopiedToast: (state: 'copied' | 'ready' | 'failed') => void;
  persistActiveTournamentSnapshot: (nextTournament: Tournament) => Promise<void>;
  toShareableTournamentSnapshot: (targetTournament: Tournament | TournamentHistory) => unknown;
  buildShareUrl: (shareId: string, view: 'active' | 'klasemen') => string;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
  serverTimestamp: () => unknown;
};

const tryCopyToClipboard = async (text: string): Promise<ShareDeliveryResult> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // fallback below
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(ta);
    if (copied) return 'copied';
    return 'copied';
  } catch {
    // fallback below
  }

  try {
    if ((navigator as any).share) {
      await (navigator as any).share({ url: text });
      return 'shared';
    }
  } catch {
    // fallback below
  }

  try {
    window.prompt('Copy this link:', text);
    return 'manual';
  } catch {
    // ignore
  }
  return 'failed';
};

export const useShareActions = ({
  userUid,
  tournament,
  isSharedViewer,
  sharedMatchId,
  setSharedMatchId,
  setLinkedShareIds,
  addNotification,
  showShareFeedbackToast,
  showShareCopiedToast,
  persistActiveTournamentSnapshot,
  toShareableTournamentSnapshot,
  buildShareUrl,
  recordDbMetric,
  recordDbError,
  serverTimestamp,
}: UseShareActionsParams) => {
  const handleShareCurrentMatch = async () => {
    try {
      const currentUid = auth.currentUser?.uid || userUid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share matches.', 'system');
        return;
      }

      let shareId = sharedMatchId || Math.random().toString(36).slice(2, 10);
      const safeTournament = toShareableTournamentSnapshot(tournament);
      const writePayload = {
        tournament: safeTournament,
        hostUid: currentUid,
        activeStartedAt: Number(tournament.startedAt || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await persistActiveTournamentSnapshot(tournament);

      try {
        await withTimeout(
          saveSharedMatch(shareId, writePayload, { merge: true }),
          SHARE_WRITE_TIMEOUT_MS,
          'Share link sync'
        );
        recordDbMetric({
          flow: 'share_host',
          operation: 'write',
          count: 1,
          label: 'share_current_match',
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION,
        });
      } catch (firstErr) {
        if (firstErr instanceof Error && firstErr.message.includes('timed out')) {
          throw firstErr;
        }
        shareId = Math.random().toString(36).slice(2, 10);
        await withTimeout(
          saveSharedMatch(shareId, writePayload, { merge: false }),
          SHARE_WRITE_TIMEOUT_MS,
          'Share link sync'
        );
        recordDbMetric({
          flow: 'share_host',
          operation: 'write',
          count: 1,
          label: 'share_current_match_fresh',
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION,
        });
      }

      setSharedMatchId(shareId);
      setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
      if (tournament?.startedAt) {
        localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
      }
      const finalUrl = buildShareUrl(shareId, 'active');

      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
      }
    } catch (err) {
      recordDbError({
        flow: 'share_host',
        label: 'share_current_match',
        err,
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION,
      });
      console.error('Share current match error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: userUid || null,
      });
      showShareCopiedToast('failed');
    }
  };

  const handleShareStandings = async (targetTournament: Tournament | TournamentHistory) => {
    try {
      if (isSharedViewer && sharedMatchId) {
        const currentSharedUrl = buildShareUrl(sharedMatchId, 'klasemen');
        const shareResult = await tryCopyToClipboard(currentSharedUrl);
        if (shareResult === 'copied') showShareCopiedToast('copied');
        else if (shareResult === 'shared' || shareResult === 'manual') showShareCopiedToast('ready');
        else showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
        return;
      }

      const currentUid = auth.currentUser?.uid || userUid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share standings.', 'system');
        return;
      }

      const isActiveTournamentShare =
        !('date' in targetTournament) &&
        Boolean((targetTournament as Tournament)?.startedAt) &&
        Boolean(tournament?.startedAt) &&
        (targetTournament as Tournament).startedAt === tournament.startedAt;
      if (isActiveTournamentShare) {
        await persistActiveTournamentSnapshot(targetTournament as Tournament);
      }
      const shareId = isActiveTournamentShare
        ? (sharedMatchId || Math.random().toString(36).slice(2, 10))
        : Math.random().toString(36).slice(2, 10);
      const safeTournament = toShareableTournamentSnapshot(targetTournament);
      await withTimeout(
        saveSharedMatch(shareId, {
          tournament: safeTournament,
          hostUid: currentUid,
          activeStartedAt: isActiveTournamentShare
            ? Number((targetTournament as Tournament).startedAt || 0)
            : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: isActiveTournamentShare }),
        SHARE_WRITE_TIMEOUT_MS,
        'Share standings sync'
      );
      recordDbMetric({
        flow: 'share_host',
        operation: 'write',
        count: 1,
        label: 'share_standings',
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION,
      });
      if (isActiveTournamentShare) {
        setSharedMatchId(shareId);
        setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
        if (tournament?.startedAt) {
          localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
        }
      }
      const finalUrl = buildShareUrl(shareId, 'klasemen');
      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
      }
    } catch (err) {
      recordDbError({
        flow: 'share_host',
        label: 'share_standings',
        err,
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION,
      });
      console.error('Share standings error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: userUid || null,
      });
      showShareCopiedToast('failed');
    }
  };

  return {
    handleShareCurrentMatch,
    handleShareStandings,
  };
};
