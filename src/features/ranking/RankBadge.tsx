import { cn } from '../../lib/utils';
import { getRankInfo } from './rankUtils';

export const RankBadge = ({
  mmr,
  size = 'md',
  showLabel = true
}: {
  mmr: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) => {
  const rank = getRankInfo(mmr);
  const Icon = rank.icon;

  const sizes = {
    sm: { container: 'px-1.5 py-0.5 gap-1', icon: 12, text: 'text-[9px]' },
    md: { container: 'px-2.5 py-1 gap-1.5', icon: 16, text: 'text-[11px]' },
    lg: { container: 'px-4 py-2 gap-2', icon: 24, text: 'text-[14px]' },
  };

  return (
    <div className={cn(
      'inline-flex items-center rounded-full font-bold uppercase tracking-wider',
      rank.color,
      sizes[size].container
    )}>
      <Icon size={sizes[size].icon} />
      {showLabel && <span className={sizes[size].text}>{rank.name}</span>}
    </div>
  );
};
