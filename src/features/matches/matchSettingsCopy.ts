import { type ElementType } from 'react';
import { RefreshCw, TrendingUp, Trophy } from 'lucide-react';
import { type MatchFormat, type RankingCriteria, type ScoringType } from '../../types';

export const MATCH_SETTINGS_WIZARD_STEPS = [
  { label: 'Info', title: 'Match Info', context: 'Naming your match' },
  { label: 'Format', title: 'Format', context: 'Choosing a format' },
  { label: 'Players', title: 'Players', context: 'Choosing players' },
  { label: 'Appearance', title: 'Appearance', context: 'Choosing appearance' },
  { label: 'Summary', title: 'Summary', context: 'Reviewing setup' }
];

export const FORMAT_IMPACT_COPY: Record<MatchFormat, {
  tagline: string;
  body: string;
  impact: string;
  icon: ElementType;
}> = {
  'Americano': {
    tagline: 'Rotating partners',
    body: 'Players change partners each round, so everyone mixes across the group.',
    impact: 'Best for social sessions, mixed skill levels, and community games.',
    icon: RefreshCw
  },
  'Mexicano': {
    tagline: 'Score-based pairing',
    body: 'The next round is paired from current standings, so stronger performers meet faster.',
    impact: 'Best when you want the session to become more competitive each round.',
    icon: TrendingUp
  },
  'Match Play': {
    tagline: 'Fixed teams',
    body: 'Teams stay the same from start to finish with a classic head-to-head flow.',
    impact: 'Best for team rivalry or a more serious match setup.',
    icon: Trophy
  }
};

export const CRITERIA_IMPACT_COPY: Record<RankingCriteria, string> = {
  'Points Won': 'Ranks players by total points. Useful for rotating formats because every point matters.',
  'Matches Won': 'Ranks players by games won. Simple and familiar for competitive match play.'
};

export const SCORING_IMPACT_COPY: Record<ScoringType, string> = {
  'Golden Point': 'In deuce, the next point wins the game. Faster and simpler.',
  'Advantage': 'In deuce, a team must lead by two points. More traditional, but games can run longer.'
};
