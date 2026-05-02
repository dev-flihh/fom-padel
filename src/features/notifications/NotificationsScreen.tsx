import { useMemo } from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type AppNotification } from '../../types';
import { getNotificationVisuals } from './notificationVisuals';

const formatRelativeNotificationTime = (timestamp: Date) => {
  const diffMs = timestamp.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const rtf = new Intl.RelativeTimeFormat('id', { style: 'short' });

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }

  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const NotificationsScreen = ({ notifications, onMarkAsRead, onClearAll, onBack }: {
  notifications: AppNotification[],
  onMarkAsRead: (id: string) => void,
  onClearAll: () => void,
  onBack: () => void
}) => {
  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [notifications]
  );
  const unreadCount = sortedNotifications.filter((notif) => !notif.read).length;

  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 z-50 flex items-center w-full px-4 h-14 border-b border-ios-gray/10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack} className="tap-target p-2 -ml-2">
            <ChevronLeft size={24} className="text-on-surface" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface truncate">Notifications</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {sortedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-ios-gray/5 rounded-full flex items-center justify-center mb-4">
              <Bell size={40} className="text-ios-gray/30" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">No notifications yet</h3>
            <p className="text-sm text-on-surface/40 font-medium">
              We will notify you when there are new matches or match updates.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[24px] border border-black/5 bg-surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Inbox</p>
                  <p className="mt-1 text-[14px] font-semibold tracking-tight text-on-surface">
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>
                <button
                  onClick={onClearAll}
                  className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-2 text-[12px] font-semibold tracking-tight text-ios-gray tap-target transition-all active:scale-[0.98]"
                >
                  Clear all
                </button>
              </div>
            </section>

            <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
            {sortedNotifications.map((notif, index) => {
              const visuals = getNotificationVisuals(notif);
              const Icon = visuals.icon;
              const timeLabel = formatRelativeNotificationTime(notif.timestamp);

              return (
                <button
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={cn(
                    'w-full px-4 py-3.5 flex gap-3.5 text-left transition-colors',
                    index !== sortedNotifications.length - 1 && 'border-b border-ios-gray/5',
                    !notif.read ? visuals.unreadRowClass : visuals.readRowClass
                  )}
                >
                  <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', visuals.iconWrapClass)}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className={cn(
                        'text-[15px] leading-tight truncate pr-2',
                        !notif.read ? `font-bold ${visuals.titleClass}` : 'font-semibold text-on-surface/70'
                      )}>
                        {notif.title}
                      </h4>
                      <span className="mt-0.5 whitespace-nowrap text-[11px] font-medium tracking-tight text-ios-gray/65">
                        {timeLabel}
                      </span>
                    </div>
                    <p className={cn(
                      'mt-1 text-[13px] leading-snug line-clamp-2',
                      !notif.read ? `font-medium ${visuals.messageClass}` : 'text-on-surface/40'
                    )}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2.5 shrink-0',
                      visuals.tone === 'error'
                        ? 'bg-[#ef4444]'
                        : visuals.tone === 'success'
                          ? 'bg-[#16a34a]'
                          : visuals.tone === 'achievement'
                            ? 'bg-[#f59e0b]'
                            : notif.type === 'match'
                              ? 'bg-blue-500'
                              : notif.type === 'tournament'
                                ? 'bg-primary'
                                : 'bg-ios-gray'
                    )} />
                  )}
                </button>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
