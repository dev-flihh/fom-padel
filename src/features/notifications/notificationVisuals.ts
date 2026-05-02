import { AlertTriangle, Award, Bell, Check, Trophy, Zap } from 'lucide-react';
import { type AppNotification } from '../../types';

export const resolveNotificationTone = (
  notification: Pick<AppNotification, 'type' | 'tone'>
): NonNullable<AppNotification['tone']> => {
  if (notification.tone) return notification.tone;
  if (notification.type === 'achievement') return 'achievement';
  if (notification.type === 'match' || notification.type === 'tournament') return 'success';
  return 'info';
};

export const getNotificationVisuals = (notification: Pick<AppNotification, 'type' | 'tone'>) => {
  const tone = resolveNotificationTone(notification);
  if (tone === 'error') {
    return {
      tone,
      cardClass: 'bg-[#fff6f5]/96 border-[#ef4444]/12',
      iconWrapClass: 'bg-[#ef4444]/10 text-[#ef4444]',
      titleClass: 'text-[#b42318]',
      messageClass: 'text-[#b42318]/82',
      dismissClass: 'text-[#b42318]/55',
      unreadRowClass: 'bg-[#fff6f5]',
      readRowClass: 'bg-white',
      icon: AlertTriangle,
    };
  }
  if (tone === 'success') {
    return {
      tone,
      cardClass: 'bg-[#f4fbf6]/96 border-[#16a34a]/12',
      iconWrapClass: 'bg-[#16a34a]/10 text-[#16a34a]',
      titleClass: 'text-[#166534]',
      messageClass: 'text-[#166534]/82',
      dismissClass: 'text-[#166534]/55',
      unreadRowClass: 'bg-[#f4fbf6]',
      readRowClass: 'bg-white',
      icon: Check,
    };
  }
  if (tone === 'achievement') {
    return {
      tone,
      cardClass: 'bg-[#fffaf0]/96 border-[#f59e0b]/14',
      iconWrapClass: 'bg-[#f59e0b]/12 text-[#d97706]',
      titleClass: 'text-[#92400e]',
      messageClass: 'text-[#92400e]/82',
      dismissClass: 'text-[#92400e]/55',
      unreadRowClass: 'bg-[#fffaf0]',
      readRowClass: 'bg-white',
      icon: Award,
    };
  }
  if (notification.type === 'match') {
    return {
      tone,
      cardClass: 'bg-white/96 border-black/6',
      iconWrapClass: 'bg-blue-500/10 text-blue-500',
      titleClass: 'text-on-surface',
      messageClass: 'text-on-surface/72',
      dismissClass: 'text-ios-gray/55',
      unreadRowClass: 'bg-blue-500/5',
      readRowClass: 'bg-white',
      icon: Trophy,
    };
  }
  if (notification.type === 'tournament') {
    return {
      tone,
      cardClass: 'bg-white/96 border-black/6',
      iconWrapClass: 'bg-primary/10 text-primary',
      titleClass: 'text-on-surface',
      messageClass: 'text-on-surface/72',
      dismissClass: 'text-ios-gray/55',
      unreadRowClass: 'bg-primary/5',
      readRowClass: 'bg-white',
      icon: Zap,
    };
  }
  return {
    tone,
    cardClass: 'bg-white/96 border-black/6',
    iconWrapClass: 'bg-ios-gray/10 text-ios-gray',
    titleClass: 'text-on-surface',
    messageClass: 'text-on-surface/72',
    dismissClass: 'text-ios-gray/55',
    unreadRowClass: 'bg-ios-gray/5',
    readRowClass: 'bg-white',
    icon: Bell,
  };
};
