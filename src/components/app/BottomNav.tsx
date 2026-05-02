import { BarChart2, Calendar, Home, User, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Screen } from '../../types';

export const BottomNav = ({
  currentScreen,
  setScreen,
  unreadCount
}: {
  currentScreen: Screen,
  setScreen: (s: Screen) => void,
  unreadCount: number
}) => {
  const tabs: { id: Screen, label: string, icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'leaderboard', label: 'Ranking', icon: BarChart2 },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 z-50 px-4"
      style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + var(--app-bottom-nav-gap, 14px))' }}
    >
      <div className="mx-auto w-full max-w-md rounded-full border border-white/70 bg-white/68 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 px-2 py-2 shadow-[0_8px_22px_rgba(17,24,39,0.08)]">
        <div className="flex items-center justify-between gap-1">
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id)}
                className={cn(
                  "relative h-10 transition-all duration-200 select-none",
                  isActive
                    ? "flex items-center gap-2 rounded-full border border-primary/12 bg-primary/[0.07] px-3.5 text-primary"
                    : "w-10 rounded-full flex items-center justify-center bg-ios-gray/[0.06] text-ios-gray"
                )}
                aria-label={tab.label}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2.2} />
                {isActive && <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">{tab.label}</span>}
                {tab.id === 'profile' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
