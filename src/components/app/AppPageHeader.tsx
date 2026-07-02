import React from 'react';
import { cn } from '../../lib/utils';

export type AppPageHeaderMetaItem = {
  label: string;
  value: React.ReactNode;
  labelFirst?: boolean;
};

export const appPageTitleClassName = 'text-[34px] font-display font-bold leading-[1.08] tracking-[-0.02em] text-on-surface sm:text-[36px]';
export const appPageSubtitleClassName = 'mt-2 text-[13px] font-medium leading-snug text-ios-gray';

export const AppPageHeader = ({
  eyebrow,
  title,
  subtitle,
  metaItems,
  leading,
  trailing,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metaItems?: AppPageHeaderMetaItem[];
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) => (
  <section className={cn('px-4', className)}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3">
        {leading && <div className="shrink-0 pt-0.5">{leading}</div>}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/90">{eyebrow}</p>
          <h1 className={cn(appPageTitleClassName, 'mt-3')}>{title}</h1>
          {subtitle && (
            <p className={appPageSubtitleClassName}>{subtitle}</p>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>

    {metaItems && metaItems.length > 0 && (
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium leading-snug text-ios-gray">
        {metaItems.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <span className="h-1 w-1 rounded-full bg-ios-gray/28" />}
            <span className="inline-flex items-baseline gap-1">
              {item.labelFirst && <span>{item.label}</span>}
              <span className="font-semibold text-on-surface tabular-nums">{item.value}</span>
              {!item.labelFirst && <span>{item.label}</span>}
            </span>
          </React.Fragment>
        ))}
      </div>
    )}
  </section>
);
