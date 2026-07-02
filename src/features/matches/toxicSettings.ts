import type { ToxicIntensity } from '../../types';

export const DEFAULT_TOXIC_INTENSITY: ToxicIntensity = 'savage';

export const TOXIC_INTENSITY_OPTIONS: Array<{
  value: ToxicIntensity;
  label: string;
  description: string;
}> = [
  {
    value: 'mild',
    label: 'Mild',
    description: 'Light banter.',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced roast.',
  },
  {
    value: 'savage',
    label: 'Savage',
    description: 'Full Hall of Shame.',
  },
];

export const normalizeToxicIntensity = (value: unknown): ToxicIntensity => (
  value === 'mild' || value === 'medium' || value === 'savage'
    ? value
    : DEFAULT_TOXIC_INTENSITY
);

export const getToxicIntensityLabel = (value: unknown) => (
  TOXIC_INTENSITY_OPTIONS.find((option) => option.value === normalizeToxicIntensity(value))?.label ||
  'Savage'
);
