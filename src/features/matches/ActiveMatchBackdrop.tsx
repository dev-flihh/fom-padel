import { cn } from '../../lib/utils';

export const ActiveMatchBackdrop = ({
  heroPhoto,
  pageBgTheme
}: {
  heroPhoto: string;
  pageBgTheme: {
    base: string;
    photoBlend: string;
  };
}) => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className={cn('absolute inset-0', pageBgTheme.base)} />
    <div className="absolute inset-x-0 top-0 h-screen min-h-screen max-h-none overflow-hidden">
      {heroPhoto && (
        <img
          src={heroPhoto}
          alt="Active background"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12]"
        />
      )}
      <div className={cn('absolute inset-0', pageBgTheme.photoBlend)} />
    </div>
  </div>
);
