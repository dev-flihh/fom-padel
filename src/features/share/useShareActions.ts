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
  skipSharePersistence?: boolean;
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

type SharePayload = { url: string; title?: string; text?: string };

const tryCopyToClipboard = async (payload: string | SharePayload): Promise<ShareDeliveryResult> => {
  const share: SharePayload = typeof payload === 'string' ? { url: payload } : payload;
  const text = share.url;
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
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(ta);
    if (copied) return 'copied';
  } catch {
    // fallback below
  }

  try {
    if ((navigator as any).share) {
      const shareData: Record<string, string> = { url: text };
      if (share.title) shareData.title = share.title;
      if (share.text) shareData.text = share.text;
      await (navigator as any).share(shareData);
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

const getShareSyncFailureMessage = (err: unknown, target: 'match' | 'standings') => {
  const errorText = err instanceof Error
    ? `${err.name} ${err.message}`
    : String(err || '');
  const normalized = errorText.toLowerCase();

  if (normalized.includes('permission') || normalized.includes('unauthorized')) {
    return `Sesi host belum aktif. Login ulang dulu untuk share ${target}.`;
  }
  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return `Koneksi lagi lambat. Coba share ${target} sekali lagi.`;
  }
  return `Belum bisa menyiapkan link ${target}. Coba lagi sebentar lagi.`;
};

const buildShareMessage = (
  view: 'active' | 'klasemen',
  tournamentName?: string
): { title: string; text: string } => {
  const name = (tournamentName || '').trim();
  const title = name ? `FOM Play — ${name}` : 'FOM Play';
  const label = name || 'padel';
  const text = view === 'klasemen'
    ? `Lihat klasemen ${label} kami di FOM Play 🏆`
    : `Pantau match ${label} kami live di FOM Play 🏸`;
  return { title, text };
};

export const useShareActions = ({
  userUid,
  tournament,
  skipSharePersistence = false,
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
  const buildViewerShareUrl = (view: 'active' | 'klasemen') => {
    if (sharedMatchId) return buildShareUrl(sharedMatchId, view);

    try {
      // Fallback for the rare viewer state without a resolved shareId: derive the
      // id from the current /m/<id> location so we keep the friendly link shape.
      const currentUrl = new URL(window.location.href);
      const fromPath = /^\/m\/([^/]+?)(?:\/klasemen)?\/?$/i.exec(currentUrl.pathname);
      if (fromPath) {
        currentUrl.pathname = `/m/${fromPath[1]}${view === 'klasemen' ? '/klasemen' : ''}`;
        currentUrl.search = '';
        currentUrl.hash = '';
        return currentUrl.toString();
      }
      currentUrl.pathname = '/app';
      if (view === 'klasemen') currentUrl.searchParams.set('view', 'klasemen');
      else currentUrl.searchParams.delete('view');
      return currentUrl.toString();
    } catch {
      return window.location.href;
    }
  };

  const shareViewerUrl = async (view: 'active' | 'klasemen') => {
    const shareResult = await tryCopyToClipboard({
      url: buildViewerShareUrl(view),
      ...buildShareMessage(view, tournament?.name),
    });
    if (shareResult === 'copied') showShareCopiedToast('copied');
    else if (shareResult === 'shared' || shareResult === 'manual') showShareCopiedToast('ready');
    else showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
  };

  const handleShareCurrentMatch = async () => {
    try {
      if (isSharedViewer) {
        await shareViewerUrl('active');
        return;
      }

      const currentUid = auth.currentUser?.uid || userUid;
      if (!currentUid) {
        const message = 'Login dulu untuk share match.';
        addNotification('Login Required', message, 'system', 'error');
        showShareFeedbackToast('failed', message);
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

      if (!skipSharePersistence) {
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
      }

      setSharedMatchId(shareId);
      setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
      if (tournament?.startedAt) {
        localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
      }
      const finalUrl = buildShareUrl(shareId, 'active');

      const shareResult = await tryCopyToClipboard({
        url: finalUrl,
        ...buildShareMessage('active', tournament?.name),
      });
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
      showShareFeedbackToast('failed', getShareSyncFailureMessage(err, 'match'));
    }
  };

  const handleShareStandings = async (targetTournament: Tournament | TournamentHistory) => {
    try {
      if (isSharedViewer) {
        await shareViewerUrl('klasemen');
        return;
      }

      const currentUid = auth.currentUser?.uid || userUid;
      if (!currentUid) {
        const message = 'Login dulu untuk share standings.';
        addNotification('Login Required', message, 'system', 'error');
        showShareFeedbackToast('failed', message);
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
      if (!skipSharePersistence) {
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
      }
      if (isActiveTournamentShare) {
        setSharedMatchId(shareId);
        setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
        if (tournament?.startedAt) {
          localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
        }
      }
      const finalUrl = buildShareUrl(shareId, 'klasemen');
      const shareResult = await tryCopyToClipboard({
        url: finalUrl,
        ...buildShareMessage('klasemen', (targetTournament as Tournament)?.name),
      });
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
      showShareFeedbackToast('failed', getShareSyncFailureMessage(err, 'standings'));
    }
  };

  return {
    handleShareCurrentMatch,
    handleShareStandings,
  };
};
