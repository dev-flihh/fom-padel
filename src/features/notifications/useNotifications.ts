import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppNotification } from '../../types';

type ShareFeedbackState = 'success' | 'ready' | 'failed';
type ShareCopiedState = 'copied' | 'ready' | 'failed';

const inferNotificationTone = (
  title: string,
  message: string,
  type: AppNotification['type'],
  explicitTone?: AppNotification['tone']
): AppNotification['tone'] => {
  if (explicitTone) return explicitTone;
  if (type === 'achievement') return 'achievement';
  if (type === 'match' || type === 'tournament') return 'success';

  const signal = `${title} ${message}`.toLowerCase();
  if (
    signal.includes('failed') ||
    signal.includes('unable') ||
    signal.includes('denied') ||
    signal.includes('problem') ||
    signal.includes('cannot') ||
    signal.includes('required') ||
    signal.includes('not found') ||
    signal.includes('declined')
  ) {
    return 'error';
  }
  if (
    signal.includes('success') ||
    signal.includes('sent') ||
    signal.includes('ready') ||
    signal.includes('updated') ||
    signal.includes('active') ||
    signal.includes('copied') ||
    signal.includes('completed') ||
    signal.includes('new friend') ||
    signal.includes('thanks') ||
    signal.includes('marked')
  ) {
    return 'success';
  }
  return 'info';
};

export const useNotifications = ({ enabled }: { enabled: boolean }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationToasts, setNotificationToasts] = useState<AppNotification[]>([]);
  const notificationToastTimeoutsRef = useRef<Record<string, number>>({});

  const unreadNotificationsCount = useMemo(
    () => (enabled ? notifications.filter((notification) => !notification.read).length : 0),
    [enabled, notifications]
  );

  useEffect(() => {
    return () => {
      (Object.values(notificationToastTimeoutsRef.current) as number[]).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      notificationToastTimeoutsRef.current = {};
    };
  }, []);

  const removeNotificationToast = (id: string) => {
    setNotificationToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = notificationToastTimeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete notificationToastTimeoutsRef.current[id];
    }
  };

  const addNotification = (
    title: string,
    message: string,
    type: AppNotification['type'],
    tone?: AppNotification['tone']
  ) => {
    if (!enabled) return;
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: new Date(),
      type,
      tone: inferNotificationTone(title, message, type, tone),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setNotificationToasts((prev) => [newNotif, ...prev].slice(0, 3));
    notificationToastTimeoutsRef.current[newNotif.id] = window.setTimeout(() => {
      setNotificationToasts((prev) => prev.filter((toast) => toast.id !== newNotif.id));
      delete notificationToastTimeoutsRef.current[newNotif.id];
    }, 3200);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  const handleMarkAsRead = (id: string) => {
    if (!enabled) return;
    setNotifications((prev) => prev.map((notification) => (
      notification.id === id ? { ...notification, read: true } : notification
    )));
  };

  const handleClearAll = () => {
    if (!enabled) return;
    setNotifications([]);
  };

  const replaceNotifications = (nextNotifications: AppNotification[]) => {
    setNotifications(nextNotifications);
    setNotificationToasts([]);
  };

  const requestNotificationPermission = async () => {
    if (!enabled) return;
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addNotification('Notifications Active!', 'You will receive match updates here.', 'system');
      }
    }
  };

  const showShareFeedbackToast = (state: ShareFeedbackState, message?: string) => {
    if (state === 'success') {
      addNotification('Share Berhasil', message || 'Link berhasil disalin dan live update sudah aktif.', 'system', 'success');
      return;
    }
    if (state === 'ready') {
      addNotification('Share Siap', message || 'Link sudah siap dibagikan dan live update sudah aktif.', 'system', 'success');
      return;
    }
    addNotification('Share Gagal', message || 'Belum bisa menyalin atau membagikan link saat ini.', 'system', 'error');
  };

  const showShareCopiedToast = (state: ShareCopiedState) => {
    if (state === 'copied') {
      showShareFeedbackToast('success');
      return;
    }
    if (state === 'ready') {
      showShareFeedbackToast('ready');
      return;
    }
    showShareFeedbackToast('failed');
  };

  return {
    notifications,
    notificationToasts,
    unreadNotificationsCount,
    addNotification,
    handleMarkAsRead,
    handleClearAll,
    replaceNotifications,
    requestNotificationPermission,
    removeNotificationToast,
    showShareFeedbackToast,
    showShareCopiedToast,
  };
};
