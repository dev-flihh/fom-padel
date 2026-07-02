import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Bell, Building2, Camera, ChevronRight, CircleHelp, Edit3, Globe, Inbox, Lock, LogOut, Mail, MapPin, RefreshCw, TrendingUp, User, Users, X, type LucideIcon } from 'lucide-react';
import { RegionSelector } from '../../components/RegionSelector';
import { cn } from '../../lib/utils';
import { auth, db, sharedDb, storage } from '../../firebase';
import { type AppNotification, type Player, type TournamentHistory } from '../../types';
import { FEEDBACK_SUBMISSIONS_COLLECTION, PLAYER_STATS_COLLECTION, USERS_COLLECTION } from '../../services/firestoreCollections';
import { getPasswordResetActionSettings, getProviderLabel, withTimeout } from '../auth/authUtils';
import { clearCachedLeaderboardUsers } from '../ranking/leaderboardCache';
import { RankBadge } from '../ranking/RankBadge';
import { formatDisplayMmr, getRankInfo, toRawMmr } from '../ranking/rankUtils';
import { appendCacheBustParam, getStorageObjectPathFromUrl } from './profileImageUtils';

export const ProfileScreen = ({
  onLogout,
  user,
  tournaments,
  setUser,
  addNotification,
  onOpenMmrHistory,
  onOpenNotifications,
  onOpenFriends,
  unreadCount,
  notificationsEnabled,
  isAdminEmail,
  recordDbMetric,
  recordDbError
}: {
  onLogout: () => void,
  user: any,
  tournaments: TournamentHistory[],
  setUser: React.Dispatch<React.SetStateAction<any>>,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void,
  onOpenMmrHistory: () => void,
  onOpenNotifications: () => void,
  onOpenFriends: () => void,
  unreadCount: number,
  notificationsEnabled: boolean,
  isAdminEmail: (email?: string | null) => boolean,
  recordDbMetric: (record: any) => void,
  recordDbError: (record: any) => void
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isFeedbackInboxOpen, setIsFeedbackInboxOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature_request' | 'ui_ux' | 'other'>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [feedbackInboxItems, setFeedbackInboxItems] = useState<any[]>([]);
  const [isFeedbackInboxLoading, setIsFeedbackInboxLoading] = useState(false);
  const [feedbackInboxStatusFilter, setFeedbackInboxStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all');
  const [feedbackInboxCategoryFilter, setFeedbackInboxCategoryFilter] = useState<'all' | 'bug' | 'feature_request' | 'ui_ux' | 'other'>('all');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [editData, setEditData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
    homeBase: user?.homeBase || user?.region || 'Jakarta Selatan, DKI Jakarta'
  });
  const feedbackCategories = [
    { value: 'bug' as const, label: 'Bug' },
    { value: 'feature_request' as const, label: 'Feature' },
    { value: 'ui_ux' as const, label: 'UI/UX' },
    { value: 'other' as const, label: 'Other' }
  ];
  const trimmedFeedbackMessage = feedbackMessage.trim();
  const canSubmitFeedback = trimmedFeedbackMessage.length > 0 && !isSubmittingFeedback;
  const accountEmail = (user?.email || '').trim().toLowerCase();
  const canSendPasswordReset = Boolean(accountEmail) && !isSubmittingPasswordReset;
  const isAdminUser = user?.role === 'admin' || isAdminEmail(accountEmail);
  const displayedPhotoURL = localPhotoPreview || user?.photoURL || '';

  useEffect(() => {
    setLocalPhotoPreview(null);
  }, [user?.uid]);

  const getFeedbackClientContext = () => {
    if (typeof window === 'undefined') {
      return {
        route: '/profile',
        displayMode: 'unknown',
        viewport: null,
        userAgent: '',
      };
    }

    return {
      route: window.location.pathname || '/profile',
      displayMode: window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: window.navigator.userAgent,
    };
  };

  const handleSaveProfile = async () => {
    try {
      await setDoc(doc(db, USERS_COLLECTION, user.uid), editData, { merge: true });
      clearCachedLeaderboardUsers();
      setUser(prev => ({ ...prev, ...editData }));
      setIsEditingProfile(false);
      addNotification('Profile Updated', 'Your profile information has been saved successfully.', 'system');
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };

  const resizeProfilePhoto = (file: File): Promise<{ blob: Blob; dataUrl: string }> => (
    new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();
      const cleanup = () => {
        URL.revokeObjectURL(image.src);
      };

      reader.onerror = () => reject(reader.error || new Error('Unable to read selected image.'));
      reader.onload = () => {
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          try {
            const maxSide = 640;
            const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Unable to prepare image canvas.');
            ctx.drawImage(image, 0, 0, width, height);

            const makeBlob = (quality: number): Promise<Blob> => (
              new Promise((blobResolve, blobReject) => {
                canvas.toBlob((blob) => {
                  if (blob) blobResolve(blob);
                  else blobReject(new Error('Unable to compress selected image.'));
                }, 'image/jpeg', quality);
              })
            );

            (async () => {
              let blob = await makeBlob(0.82);
              let quality = 0.72;
              while (blob.size > 850000 && quality >= 0.42) {
                blob = await makeBlob(quality);
                quality -= 0.1;
              }
              const dataUrl = canvas.toDataURL('image/jpeg', Math.max(quality + 0.1, 0.42));
              cleanup();
              resolve({ blob, dataUrl });
            })().catch((err) => {
              cleanup();
              reject(err);
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        image.onerror = () => {
          cleanup();
          reject(new Error('Selected file is not a readable image.'));
        };
        image.src = objectUrl;
      };
      reader.readAsArrayBuffer(file);
    })
  );

  const handleUploadProfilePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingPhoto) return;
    const authUid = auth.currentUser?.uid || '';
    const targetUid = user?.uid || authUid;
    if (!authUid || !targetUid) {
      addNotification('Upload Photo', 'Please sign in again before updating your photo.', 'system');
      return;
    }
    if (authUid && user?.uid && authUid !== user.uid) {
      addNotification('Upload Photo', 'Session is syncing. Please reopen profile and try again.', 'system');
      return;
    }
    if (!file.type.startsWith('image/')) {
      addNotification('Upload Photo', 'Please choose an image file.', 'system');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      addNotification('Upload Photo', 'Image is too large. Please choose a photo under 8 MB.', 'system');
      return;
    }

    const previousPhotoURL = user?.photoURL || '';
    setIsUploadingPhoto(true);
    let hasReleasedUploadState = false;
    const releaseUploadState = () => {
      if (hasReleasedUploadState) return;
      hasReleasedUploadState = true;
      setIsUploadingPhoto(false);
    };
    try {
      const uploadVersion = Date.now();
      const { blob, dataUrl } = await withTimeout(
        resizeProfilePhoto(file),
        15000,
        'Profile photo resize'
      );
      let photoURL = dataUrl;
      setLocalPhotoPreview(dataUrl);
      setUser((prev: any) => {
        if (!prev || prev.uid !== targetUid) return prev;
        return { ...prev, photoURL: dataUrl };
      });
      releaseUploadState();

      if (dataUrl.length > 880000) {
        throw new Error('Compressed image is too large for profile fallback storage.');
      }

      let savedToFirestore = false;
      let savedToAuth = false;

      try {
        const fallbackPayload = {
          photoURL: dataUrl,
          updatedAt: serverTimestamp()
        };
        await withTimeout(
          setDoc(doc(db, USERS_COLLECTION, targetUid), fallbackPayload, { merge: true }),
          12000,
          'Profile photo fallback save'
        );
        savedToFirestore = true;
      } catch (firestoreErr) {
        console.warn('Profile photo fallback Firestore save failed:', firestoreErr);
      }

      try {
        await withTimeout(
          setDoc(doc(db, PLAYER_STATS_COLLECTION, targetUid), {
            uid: targetUid,
            photoURL: dataUrl,
            updatedAt: serverTimestamp()
          }, { merge: true }),
          12000,
          'Profile photo stats mirror save'
        );
      } catch (statsErr) {
        console.warn('Profile photo player_stats mirror failed:', statsErr);
      }

      if (auth.currentUser && auth.currentUser.uid === targetUid) {
        try {
          await withTimeout(
            updateProfile(auth.currentUser, { photoURL: dataUrl }),
            10000,
            'Auth profile fallback sync'
          );
          savedToAuth = true;
        } catch (authErr) {
          console.warn('Auth profile photo sync failed:', authErr);
        }
      }

      if (!savedToFirestore && !savedToAuth) {
        throw new Error('Unable to persist profile photo to Firestore or Auth.');
      }
      clearCachedLeaderboardUsers();
      addNotification('Upload Photo', 'Your profile photo has been updated.', 'system');

      try {
        const canonicalPhotoPath = `profile-photos/${targetUid}/avatar.jpg`;
        const previousStorageObjectPath = getStorageObjectPathFromUrl(previousPhotoURL);
        const photoRef = storageRef(storage, canonicalPhotoPath);
        await withTimeout(
          uploadBytes(photoRef, blob, {
            contentType: 'image/jpeg',
            customMetadata: { ownerUid: targetUid }
          }),
          12000,
          'Profile photo upload'
        );
        const downloadUrl = await withTimeout(
          getDownloadURL(photoRef),
          6000,
          'Profile photo URL fetch'
        );
        photoURL = appendCacheBustParam(downloadUrl, uploadVersion);
        setLocalPhotoPreview(photoURL);
        setUser((prev: any) => {
          if (!prev || prev.uid !== targetUid) return prev;
          return { ...prev, photoURL };
        });
        try {
          const storagePayload = {
            photoURL,
            updatedAt: serverTimestamp()
          };
          await withTimeout(
            setDoc(doc(db, USERS_COLLECTION, targetUid), storagePayload, { merge: true }),
            12000,
            'Profile photo save'
          );
        } catch (firestoreErr) {
          console.warn('Profile photo Firestore storage URL sync failed:', firestoreErr);
        }
        try {
          await withTimeout(
            setDoc(doc(db, PLAYER_STATS_COLLECTION, targetUid), {
              uid: targetUid,
              photoURL,
              updatedAt: serverTimestamp()
            }, { merge: true }),
            12000,
            'Profile photo stats URL sync'
          );
        } catch (statsErr) {
          console.warn('Profile photo player_stats URL sync failed:', statsErr);
        }
        if (auth.currentUser && auth.currentUser.uid === targetUid) {
          await withTimeout(
            updateProfile(auth.currentUser, { photoURL }),
            10000,
            'Auth profile photo sync'
          ).catch((authErr) => {
            console.warn('Auth profile photo sync failed:', authErr);
          });
        }
        if (previousStorageObjectPath && previousStorageObjectPath !== canonicalPhotoPath) {
          await withTimeout(
            deleteObject(storageRef(storage, previousStorageObjectPath)),
            10000,
            'Previous profile photo cleanup'
          ).catch((cleanupErr) => {
            console.warn('Previous profile photo cleanup failed:', cleanupErr);
          });
        }
      } catch (storageErr) {
        console.warn('Profile photo Storage upload failed, keeping Firestore data URL fallback:', storageErr);
      }
    } catch (err) {
      console.error('Upload profile photo error:', err);
      setLocalPhotoPreview(previousPhotoURL || null);
      setUser((prev: any) => {
        if (!prev || prev.uid !== targetUid) return prev;
        return { ...prev, photoURL: previousPhotoURL };
      });
      addNotification('Upload Photo', 'Unable to update photo right now. Please try another image.', 'system');
    } finally {
      releaseUploadState();
    }
  };
  useEffect(() => {
    if (!isAdminUser || !isFeedbackInboxOpen) {
      setFeedbackInboxItems([]);
      setIsFeedbackInboxLoading(false);
      return;
    }

    setIsFeedbackInboxLoading(true);
    const feedbackQuery = query(
      collection(sharedDb, FEEDBACK_SUBMISSIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let isCancelled = false;
    const loadFeedbackInbox = async () => {
      try {
        const snapshot = await getDocs(feedbackQuery);
        recordDbMetric({
          flow: 'feedback_inbox',
          operation: 'read',
          count: 1,
          docs: snapshot.docs.length,
          label: 'feedback_inbox',
          dbRole: 'ephemeral',
          collection: FEEDBACK_SUBMISSIONS_COLLECTION
        });
        if (isCancelled) return;
        setFeedbackInboxItems(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })));
      } catch (err) {
        recordDbError({
          flow: 'feedback_inbox',
          label: 'feedback_inbox',
          err,
          dbRole: 'ephemeral',
          collection: FEEDBACK_SUBMISSIONS_COLLECTION
        });
        console.error('Feedback inbox fetch error:', err);
        if (!isCancelled) {
          addNotification('Feedback Inbox', 'Unable to load feedback right now.', 'system');
        }
      } finally {
        if (!isCancelled) setIsFeedbackInboxLoading(false);
      }
    };

    void loadFeedbackInbox();
    return () => {
      isCancelled = true;
    };
  }, [addNotification, isAdminUser, isFeedbackInboxOpen]);

  const stats = useMemo(() => {
    const uid = user?.uid;
    const displayName = (user?.displayName || '').trim().toLowerCase();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    let matches = 0;
    let won = 0;
    let lost = 0;
    let draw = 0;
    let points = 0;
    let currentMonthWins = 0;
    let previousMonthWins = 0;

    const isCurrentUser = (player?: Player) => {
      if (!player) return false;
      if (uid && player.id === uid) return true;
      if (displayName && player.name?.trim().toLowerCase() === displayName) return true;
      return false;
    };

    tournaments.forEach((tournament) => {
      const tDateRaw = (tournament as any)?.date;
      const tDate = tDateRaw instanceof Date
        ? tDateRaw
        : (tDateRaw?.toDate ? tDateRaw.toDate() : new Date(tDateRaw));
      const hasValidDate = tDate instanceof Date && !Number.isNaN(tDate.getTime());
      const rounds = tournament.rounds || [];

      rounds.forEach((round) => {
        (round.matches || []).forEach((match) => {
          if (!match) return;
          const userInA = (match.teamA?.players || []).some((p) => isCurrentUser(p));
          const userInB = (match.teamB?.players || []).some((p) => isCurrentUser(p));
          if (!userInA && !userInB) return;

          const scoreA = Number(match.teamA?.score || 0);
          const scoreB = Number(match.teamB?.score || 0);
          const userScore = userInA ? scoreA : scoreB;
          const oppScore = userInA ? scoreB : scoreA;

          matches += 1;
          points += userScore;

          if (userScore > oppScore) {
            won += 1;
            if (hasValidDate) {
              const m = tDate.getMonth();
              const y = tDate.getFullYear();
              if (m === currentMonth && y === currentYear) currentMonthWins += 1;
              if (m === prevMonth && y === prevYear) previousMonthWins += 1;
            }
          } else if (userScore < oppScore) {
            lost += 1;
          } else {
            draw += 1;
          }
        });
      });
    });

    const ssotTotalMatches = Number(user?.totalMatches);
    const ssotWins = Number(user?.wins);
    const ssotLosses = Number(user?.losses);
    const resolvedMatches = Number.isFinite(ssotTotalMatches) && ssotTotalMatches >= 0
      ? ssotTotalMatches
      : matches;
    const resolvedWon = Number.isFinite(ssotWins) && ssotWins >= 0
      ? ssotWins
      : won;
    const resolvedLosses = Number.isFinite(ssotLosses) && ssotLosses >= 0
      ? ssotLosses
      : lost;
    const resolvedDraw = Math.max(0, resolvedMatches - resolvedWon - resolvedLosses);
    const winRate = resolvedMatches > 0 ? Math.round((resolvedWon / resolvedMatches) * 100) : 0;
    const winChangePercent = previousMonthWins > 0
      ? Math.round(((currentMonthWins - previousMonthWins) / previousMonthWins) * 100)
      : (currentMonthWins > 0 ? 100 : 0);

    return {
      matches: resolvedMatches,
      winRate,
      points,
      won: resolvedWon,
      lost: resolvedLosses,
      draw: resolvedDraw,
      currentMonthWins,
      previousMonthWins,
      winChangePercent
    };
  }, [tournaments, user?.uid, user?.displayName, user?.totalMatches, user?.wins, user?.losses]);

  const currentMmr = toRawMmr(user?.mmr);
  const rankInfo = getRankInfo(currentMmr);
  const rankProgress = Math.max(0, Math.min(100, Number.isFinite(rankInfo.progress) ? rankInfo.progress : 100));
  const nextRankDelta = rankInfo.nextRank ? Math.max(0, rankInfo.nextRank.min - currentMmr) : 0;
  const displayUsername = String(user?.username || 'user').trim() || 'user';
  const displayEmail = String(user?.email || '').trim();
  const getShortLocation = (value?: string) => (
    String(value || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)[0] || ''
  );
  const homeBaseLabel = getShortLocation(user?.homeBase || user?.region) || 'Jakarta';
  const activeZoneLabel = getShortLocation(user?.region);
  const profileMetaCards: { label: string; value: string; icon: LucideIcon; tone: 'warm' | 'neutral' }[] = [
    { label: 'Home Base', value: homeBaseLabel, icon: MapPin, tone: 'warm' },
  ];
  if (activeZoneLabel && activeZoneLabel !== homeBaseLabel) {
    profileMetaCards.push({ label: 'Active Zone', value: activeZoneLabel, icon: Building2, tone: 'neutral' });
  }
  const hasSingleProfileMeta = profileMetaCards.length === 1;
  const monthTrendValue = stats.currentMonthWins > 0 ? `${stats.currentMonthWins}` : '0';
  const monthTrendHelper = stats.previousMonthWins > 0
    ? `${stats.winChangePercent >= 0 ? '+' : ''}${stats.winChangePercent}% vs last month`
    : stats.currentMonthWins > 0
      ? 'First wins this month'
      : 'No wins recorded';
  const monthTrendTone = stats.winChangePercent > 0
    ? 'text-emerald-600'
    : stats.winChangePercent < 0
      ? 'text-error'
      : 'text-on-surface';

  const handleChangePassword = async () => {
    const email = (user?.email || '').trim().toLowerCase();
    if (!email) {
      addNotification('Change Password', 'Change password is coming soon.', 'system');
      return;
    }

    const providerIds = (user?.providerData || []).map((provider: { providerId?: string }) => provider?.providerId).filter(Boolean);
    if (providerIds.length > 0 && !providerIds.includes('password')) {
      addNotification('Change Password', `This account uses ${getProviderLabel(providerIds[0])}. There is no password to reset here.`, 'system');
      return;
    }

    setIsSubmittingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, email, getPasswordResetActionSettings());
      closeChangePasswordModal();
      addNotification('Change Password', 'Password reset link has been sent. Please check inbox, spam, or promotions.', 'system');
    } catch (err) {
      console.error('Change password request error:', err);
      addNotification('Change Password', 'Unable to send reset link right now. Please try again.', 'system');
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  };

  const handleComingSoon = (label: string) => {
    addNotification(label, `${label} is coming soon.`, 'system');
  };

  const resetFeedbackForm = () => {
    setFeedbackCategory('bug');
    setFeedbackMessage('');
  };

  const closeFeedbackModal = () => {
    if (isSubmittingFeedback) return;
    setIsFeedbackOpen(false);
    resetFeedbackForm();
  };

  const closeChangePasswordModal = () => {
    if (isSubmittingPasswordReset) return;
    setIsChangePasswordOpen(false);
  };

  const closeFeedbackInboxModal = () => {
    setIsFeedbackInboxOpen(false);
  };

  const formatFeedbackDate = (value: any) => {
    const date = value?.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFeedbackCategoryLabel = (value: string) => {
    if (value === 'feature_request') return 'Feature';
    if (value === 'ui_ux') return 'UI/UX';
    if (value === 'bug') return 'Bug';
    return 'Other';
  };

  const getFeedbackStatusLabel = (value: string) => {
    if (value === 'reviewed') return 'Reviewed';
    if (value === 'resolved') return 'Resolved';
    return 'New';
  };

  const getFeedbackStatusTone = (value: string) => {
    if (value === 'resolved') return 'bg-primary/10 text-primary';
    if (value === 'reviewed') return 'bg-ios-gray/12 text-on-surface/70';
    return 'bg-[#fff3ec] text-primary';
  };

  const filteredFeedbackInboxItems = useMemo(() => (
    feedbackInboxItems.filter((item) => {
      const statusMatch = feedbackInboxStatusFilter === 'all' || item.status === feedbackInboxStatusFilter;
      const categoryMatch = feedbackInboxCategoryFilter === 'all' || item.category === feedbackInboxCategoryFilter;
      return statusMatch && categoryMatch;
    })
  ), [feedbackInboxCategoryFilter, feedbackInboxItems, feedbackInboxStatusFilter]);

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: 'reviewed' | 'resolved') => {
    if (!isAdminUser) return;
    setUpdatingFeedbackId(feedbackId);
    try {
      await setDoc(doc(sharedDb, FEEDBACK_SUBMISSIONS_COLLECTION, feedbackId), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      }, { merge: true });
      recordDbMetric({
        flow: 'feedback_inbox',
        operation: 'write',
        count: 1,
        label: 'update_status',
        dbRole: 'ephemeral',
        collection: FEEDBACK_SUBMISSIONS_COLLECTION
      });
      setFeedbackInboxItems((prev) => prev.map((item) => (
        item.id === feedbackId
          ? { ...item, status, reviewedAt: new Date(), reviewedBy: user?.uid || null }
          : item
      )));
      addNotification('Feedback Inbox', `Feedback marked as ${status}.`, 'system');
    } catch (err) {
      recordDbError({
        flow: 'feedback_inbox',
        label: 'update_status',
        err,
        dbRole: 'ephemeral',
        collection: FEEDBACK_SUBMISSIONS_COLLECTION
      });
      console.error('Feedback status update error:', err);
      addNotification('Feedback Inbox', 'Unable to update feedback status right now.', 'system');
    } finally {
      setUpdatingFeedbackId(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!trimmedFeedbackMessage) {
      addNotification('Give Feedback', 'Please write a short message before sending.', 'system');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const providerIds = (user?.providerData || [])
        .map((provider: { providerId?: string }) => provider?.providerId)
        .filter(Boolean);
      const clientContext = getFeedbackClientContext();
      await addDoc(collection(sharedDb, FEEDBACK_SUBMISSIONS_COLLECTION), {
        uid: user?.uid || null,
        displayName: user?.displayName || '',
        username: user?.username || '',
        email: user?.email || '',
        category: feedbackCategory,
        message: trimmedFeedbackMessage,
        screen: 'profile',
        source: 'profile_settings',
        status: 'new',
        appVersion: '1.2.0-beta',
        providerIds,
        clientTimestamp: new Date().toISOString(),
        route: clientContext.route,
        displayMode: clientContext.displayMode,
        viewport: clientContext.viewport,
        userAgent: clientContext.userAgent,
        context: {
          mmr: currentMmr,
          totalMatches: stats.matches,
          winRate: stats.winRate,
        },
        createdAt: serverTimestamp()
      });
      recordDbMetric({
        flow: 'feedback_submit',
        operation: 'write',
        count: 1,
        label: 'profile_settings',
        dbRole: 'ephemeral',
        collection: FEEDBACK_SUBMISSIONS_COLLECTION
      });
      closeFeedbackModal();
      addNotification('Give Feedback', 'Thanks, feedback kamu sudah terkirim.', 'system');
    } catch (err) {
      recordDbError({
        flow: 'feedback_submit',
        label: 'profile_settings',
        err,
        dbRole: 'ephemeral',
        collection: FEEDBACK_SUBMISSIONS_COLLECTION
      });
      console.error('Feedback submit error:', err);
      addNotification('Give Feedback', 'Unable to send feedback right now. Please try again.', 'system');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const accountItems = [
    { label: 'Change Password', icon: Lock, onClick: () => setIsChangePasswordOpen(true), tone: 'default' as const },
    { label: 'Privacy Policy', icon: Globe, onClick: () => handleComingSoon('Privacy Policy'), tone: 'default' as const },
    { label: 'FAQ', icon: CircleHelp, onClick: () => handleComingSoon('FAQ'), tone: 'default' as const },
  ];
  const supportItems = [
    { label: 'Give Feedback', icon: Mail, onClick: () => { resetFeedbackForm(); setIsFeedbackOpen(true); }, tone: 'default' as const }
  ];
  const adminItems = isAdminUser
    ? [{ label: 'Feedback Inbox', icon: Inbox, onClick: () => setIsFeedbackInboxOpen(true), tone: 'default' as const }]
    : [];
  const settingsSections = [
    {
      label: 'Account',
      description: '',
      items: [
        { label: 'Edit Profile', icon: Edit3, onClick: () => setIsEditingProfile(true), tone: 'default' as const },
        { label: 'Friends', icon: Users, onClick: onOpenFriends, tone: 'default' as const },
        ...accountItems
      ],
    },
    {
      label: 'Support',
      description: '',
      items: supportItems,
    },
    ...(adminItems.length > 0
      ? [{
        label: 'Admin',
        description: '',
        items: adminItems,
      }]
      : []),
  ];
  const renderActionRow = (
    { label, icon: Icon, onClick, tone }: { label: string; icon: LucideIcon; onClick: () => void; tone: 'default' | 'danger' }
  ) => (
    <button
      key={label}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 bg-transparent px-4 py-2.5 text-left tap-target transition-colors active:bg-surface"
    >
      <span className="inline-flex items-center gap-3 min-w-0">
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          tone === 'danger'
            ? 'border-error/12 bg-error/[0.04] text-error/85'
            : 'border-black/5 bg-surface text-on-surface/58'
        )}>
          <Icon size={15} />
        </span>
        <span
          className={cn(
            'text-[13px] font-semibold tracking-[-0.014em] truncate',
            tone === 'danger' ? 'text-error' : 'text-on-surface'
          )}
        >
          {label}
        </span>
      </span>
      <ChevronRight
        size={15}
        className={cn(
          'shrink-0',
          tone === 'danger' ? 'text-error/35' : 'text-ios-gray/40'
        )}
      />
    </button>
  );

  return (
    <div className="ios-page pb-[calc(var(--app-safe-bottom,0px)+124px)]">
      <main className="mx-auto max-w-2xl space-y-4.5 px-4 pt-5 sm:space-y-5 sm:pt-8">
        <section className="relative overflow-hidden rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_10px_26px_rgba(17,24,39,0.045)] sm:rounded-[30px] sm:p-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent sm:h-28" />
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/[0.05] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/90">
                    Player Profile
                  </span>
                  {notificationsEnabled && (
                    <button
                      type="button"
                      onClick={onOpenNotifications}
                      aria-label="Open notifications"
                      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white text-on-surface/68 tap-target active:bg-surface"
                    >
                      <Bell size={14} className="text-on-surface/64" />
                      {unreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-white bg-error" />
                      )}
                    </button>
                  )}
                </div>
                <h2 className="mt-3 text-[34px] font-display font-bold leading-[1.08] tracking-[-0.02em] text-on-surface sm:text-[36px]">
                  {user?.displayName || 'Padel Player'}
                </h2>
                <p className="mt-1.5 text-[14px] font-semibold tracking-tight text-on-surface/66 sm:mt-2">
                  @{displayUsername}
                </p>
                <div className="mt-3">
                  {displayEmail && (
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-medium text-ios-gray sm:py-2 sm:text-[12px]">
                      <Mail size={13} className="shrink-0 text-primary/62" />
                      <span className="truncate">{displayEmail}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative shrink-0">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUploadProfilePhoto}
                />
                <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[24px] border border-black/5 bg-surface sm:h-[88px] sm:w-[88px] sm:rounded-[26px]">
                  {displayedPhotoURL ? (
                    <img src={displayedPhotoURL} alt={user.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={38} className="text-ios-gray/32 sm:hidden" />
                  )}
                  {!displayedPhotoURL && (
                    <User size={42} className="hidden text-ios-gray/32 sm:block" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  aria-label="Upload profile photo"
                  className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-[0_8px_16px_rgba(230,94,20,0.16)] tap-target disabled:cursor-wait disabled:opacity-70 sm:-bottom-2 sm:-right-2 sm:h-9 sm:w-9"
                >
                  {isUploadingPhoto ? (
                    <RefreshCw size={12} className="animate-spin sm:hidden" />
                  ) : (
                    <Camera size={12} className="sm:hidden" />
                  )}
                  {isUploadingPhoto ? (
                    <RefreshCw size={13} className="hidden animate-spin sm:block" />
                  ) : (
                    <Camera size={13} className="hidden sm:block" />
                  )}
                </button>
              </div>
            </div>

            <div className={cn(
              'mt-5 grid gap-3 sm:mt-5.5',
              hasSingleProfileMeta ? 'grid-cols-1' : 'grid-cols-2'
            )}>
              {profileMetaCards.map(({ label, value, icon: Icon, tone }) => (
                <div
                  key={label}
                  className={cn(
                    'min-w-0 rounded-[20px] border px-3.5 py-3 sm:px-4 sm:py-3.5',
                    tone === 'warm'
                      ? 'border-primary/10 bg-primary/[0.03]'
                      : 'border-black/5 bg-surface'
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-tight text-ios-gray">
                    <Icon size={13} className={tone === 'warm' ? 'text-primary/75' : 'text-ios-gray/70'} />
                    <span>{label}</span>
                  </div>
                  <p className="mt-1 truncate text-[13px] font-semibold tracking-tight text-on-surface sm:mt-1.5 sm:text-[14px]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_10px_26px_rgba(17,24,39,0.04)] sm:rounded-[30px] sm:p-5">
          <div>
            <div>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">
                Match Performance
              </h3>
            </div>
          </div>

          <div className="mt-4.5 rounded-[24px] border border-primary/10 bg-primary/[0.03] p-4 sm:mt-5 sm:p-4.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">Current MMR</p>
                <p className="mt-2 text-[38px] leading-none font-display font-black tracking-[-0.05em] text-on-surface tabular-nums sm:text-[40px]">
                  {formatDisplayMmr(currentMmr)}
                </p>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-on-surface/68">
                  {rankInfo.nextRank
                    ? `${nextRankDelta.toLocaleString()} MMR to reach ${rankInfo.nextRank.name}.`
                    : 'You are already at the highest published tier.'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenMmrHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-tight text-primary tap-target active:text-primary/80"
                >
                  History
                  <ChevronRight size={12} />
                </button>
                <div className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/5">
                  <RankBadge mmr={currentMmr} size="sm" />
                </div>
              </div>
            </div>

            <div className="mt-4.5">
              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-tight text-ios-gray sm:text-[11px]">
                <span>{rankInfo.name}</span>
                <span>{rankInfo.nextRank ? rankInfo.nextRank.name : 'Maxed Out'}</span>
              </div>
              <div className="h-2 rounded-full bg-primary/[0.10]">
                <div
                  className="h-full rounded-full bg-primary/95 transition-[width]"
                  style={{ width: `${rankProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <div className="min-h-[88px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Matches</p>
              <p className="mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] text-on-surface tabular-nums">
                {stats.matches}
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                {stats.won}W • {stats.lost}L • {stats.draw}D
              </p>
            </div>
            <div className="min-h-[88px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Win Rate</p>
              <p className="mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] text-emerald-600 tabular-nums">
                {stats.winRate}%
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                {stats.points} total points
              </p>
            </div>
            <div className="col-span-2 min-h-[84px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">This Month</p>
                  <p className={cn('mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] tabular-nums', monthTrendTone)}>
                    {monthTrendValue}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                    {monthTrendHelper}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white">
                  <TrendingUp size={17} className={monthTrendTone} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-2.5 shadow-[0_10px_26px_rgba(17,24,39,0.04)] sm:rounded-[30px] sm:p-3.5">
          <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
            {settingsSections.map((section, index) => (
              <div key={section.label} className={cn(index > 0 && 'border-t border-black/5')}>
                <div className={cn('px-4 pt-3', section.description ? 'pb-1.5' : 'pb-2')}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">{section.label}</p>
                  {section.description && (
                    <p className="mt-1 text-[12px] leading-[1.5] text-ios-gray">{section.description}</p>
                  )}
                </div>
                <div className="overflow-hidden bg-white">
                  <div className="divide-y divide-black/5">
                    {section.items.map(renderActionRow)}
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-black/5">
              <div className="px-4 pb-2 pt-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">Session</p>
              </div>
              <div className="bg-white">
                {renderActionRow({ label: 'Sign Out', icon: LogOut, onClick: onLogout, tone: 'danger' })}
              </div>
            </div>
          </div>
        </section>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isChangePasswordOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeChangePasswordModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Change Password</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Kami akan kirim reset link ke email akun kamu.</p>
                  </div>
                  <button
                    onClick={closeChangePasswordModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="rounded-3xl bg-ios-gray/5 border border-ios-gray/10 px-4 py-3 mb-5">
                  <p className="text-[10px] font-black text-ios-gray uppercase tracking-[0.16em] mb-1">Email</p>
                  <p className="text-[14px] font-semibold text-on-surface break-all">
                    {user?.email || 'No email connected'}
                  </p>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={!canSendPasswordReset}
                  className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 tap-target disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
                >
                  {isSubmittingPasswordReset ? 'Sending...' : 'Send Reset Link'}
                </button>
              </motion.div>
            </div>
          )}
          {isFeedbackOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeFeedbackModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Give Feedback</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Punya bug, ide, atau masukan? Tulis singkat aja.</p>
                  </div>
                  <button
                    onClick={closeFeedbackModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {feedbackCategories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setFeedbackCategory(category.value)}
                      className={cn(
                        'px-3 py-2 rounded-full text-[12px] font-bold tap-target transition-all',
                        feedbackCategory === category.value
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <div className="mb-5">
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    rows={4}
                    placeholder="Contoh: tombol save kadang tidak responsif"
                    className="w-full resize-none bg-ios-gray/5 border border-ios-gray/10 rounded-3xl px-4 py-3 text-[14px] text-on-surface font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  disabled={!canSubmitFeedback}
                  className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 tap-target disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
                >
                  {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
                </button>
              </motion.div>
            </div>
          )}
          {isFeedbackInboxOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeFeedbackInboxModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl max-h-[82vh] flex flex-col"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Feedback Inbox</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Masukan terbaru dari user FOM Play.</p>
                  </div>
                  <button
                    onClick={closeFeedbackInboxModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'new', 'reviewed', 'resolved'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setFeedbackInboxStatusFilter(status)}
                          className={cn(
                            'px-3 py-2 rounded-full text-[11px] font-bold tap-target transition-all',
                            feedbackInboxStatusFilter === status
                              ? 'bg-primary text-white shadow-lg shadow-primary/20'
                              : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                          )}
                        >
                          {status === 'all' ? 'All Status' : getFeedbackStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([{ value: 'all', label: 'All Type' }, ...feedbackCategories.map((category) => ({ value: category.value, label: category.label }))] as const).map((category) => (
                        <button
                          key={category.value}
                          onClick={() => setFeedbackInboxCategoryFilter(category.value)}
                          className={cn(
                            'px-3 py-2 rounded-full text-[11px] font-bold tap-target transition-all',
                            feedbackInboxCategoryFilter === category.value
                              ? 'bg-on-surface text-white'
                              : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                          )}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isFeedbackInboxLoading ? (
                    <div className="rounded-3xl bg-ios-gray/5 px-4 py-8 text-center">
                      <p className="text-[13px] font-semibold text-ios-gray">Loading feedback...</p>
                    </div>
                  ) : filteredFeedbackInboxItems.length === 0 ? (
                    <div className="rounded-3xl bg-ios-gray/5 px-4 py-8 text-center">
                      <Inbox size={24} className="mx-auto text-ios-gray/35 mb-2" />
                      <p className="text-[13px] font-semibold text-on-surface">Belum ada feedback yang cocok dengan filter ini.</p>
                    </div>
                  ) : (
                    filteredFeedbackInboxItems.map((item) => (
                      <article key={item.id} className="rounded-[24px] bg-ios-gray/5 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-on-surface truncate">
                              {item.displayName || item.username || item.email || 'Unknown user'}
                            </p>
                            <p className="text-[12px] text-ios-gray truncate">
                              {item.email || '@' + (item.username || 'unknown')}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                            {getFeedbackCategoryLabel(item.category)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]', getFeedbackStatusTone(item.status || 'new'))}>
                            {getFeedbackStatusLabel(item.status || 'new')}
                          </span>
                        </div>
                        <p className="mt-3 text-[14px] leading-relaxed text-on-surface">
                          {item.message || '-'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdateFeedbackStatus(item.id, 'reviewed')}
                            disabled={updatingFeedbackId === item.id || item.status === 'reviewed' || item.status === 'resolved'}
                            className="h-8 px-3 rounded-full bg-white text-[11px] font-bold text-on-surface border border-ios-gray/10 tap-target disabled:opacity-50"
                          >
                            {updatingFeedbackId === item.id ? 'Updating...' : 'Mark Reviewed'}
                          </button>
                          <button
                            onClick={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                            disabled={updatingFeedbackId === item.id || item.status === 'resolved'}
                            className="h-8 px-3 rounded-full bg-primary text-[11px] font-bold text-white tap-target disabled:opacity-50"
                          >
                            {updatingFeedbackId === item.id ? 'Updating...' : 'Mark Resolved'}
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ios-gray">
                          <span className="truncate">
                            {item.source === 'profile_settings' ? 'Profile Settings' : item.source || 'Unknown source'}
                          </span>
                          <span className="shrink-0">
                            {formatFeedbackDate(item.createdAt || item.clientTimestamp)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
          {isEditingProfile && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditingProfile(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Edit Profile</h3>
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-ios-gray/5 rounded-full tap-target">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={editData.displayName}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Username</label>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Home Base</label>
                    <button
                      onClick={() => setIsRegionSelectorOpen(true)}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-left text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between"
                    >
                      <span className={editData.homeBase ? "text-on-surface" : "text-ios-gray"}>
                        {editData.homeBase || 'Select Region'}
                      </span>
                      <MapPin size={18} className="text-ios-gray" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 tap-target"
                >
                  Save Changes
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <RegionSelector
          isOpen={isRegionSelectorOpen}
          onClose={() => setIsRegionSelectorOpen(false)}
          onSelect={(region) => setEditData({ ...editData, homeBase: region })}
          currentValue={editData.homeBase}
        />
        <section className="pb-0 pt-2">
          <p className="text-center text-[10px] text-ios-gray/35 font-medium tracking-[0.02em]">FOM Play VERSION 1.2.0 (BETA)</p>
        </section>
      </main>
    </div>
  );
};
