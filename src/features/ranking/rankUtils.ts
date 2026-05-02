import { Award, Circle, Star, Trophy, TrendingUp, Zap, type LucideIcon } from 'lucide-react';
import { RankTier } from '../../types';

export type RankInfo = {
  name: RankTier;
  min: number;
  max: number;
  color: string;
  icon: LucideIcon;
};

export const RANK_TIERS: RankInfo[] = [
  { name: 'Rookie', min: 0, max: 799, color: 'bg-ios-gray/10 text-ios-gray', icon: Circle },
  { name: 'Amateur', min: 800, max: 1699, color: 'bg-orange-400/10 text-orange-600', icon: Zap },
  { name: 'Challenger', min: 1700, max: 2899, color: 'bg-purple-500/10 text-purple-600', icon: TrendingUp },
  { name: 'Elite', min: 2900, max: 4499, color: 'bg-blue-500/10 text-blue-600', icon: Award },
  { name: 'Master', min: 4500, max: 6699, color: 'bg-emerald-500/10 text-emerald-600', icon: Star },
  { name: 'Grandmaster', min: 6700, max: 9699, color: 'bg-red-500/10 text-red-600', icon: Zap },
  { name: 'Legend', min: 9700, max: 13699, color: 'bg-yellow-400/10 text-yellow-600', icon: Trophy },
  { name: 'Hall of Fame', min: 13700, max: Infinity, color: 'bg-primary/10 text-primary', icon: Award },
];

export const getRankInfo = (mmr: number) => {
  const rank = RANK_TIERS.find(r => mmr >= r.min && mmr <= r.max) || RANK_TIERS[0];
  const nextRank = RANK_TIERS[RANK_TIERS.indexOf(rank) + 1];
  const progress = nextRank ? Math.max(0, ((mmr - rank.min) / (nextRank.min - rank.min)) * 100) : 100;
  return { ...rank, progress, nextRank };
};
