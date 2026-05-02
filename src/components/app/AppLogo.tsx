import { cn } from '../../lib/utils';

export const AppLogo = ({ className }: { className?: string }) => (
  <img
    src="https://res.cloudinary.com/dfyov6lu7/image/upload/v1775573986/FOM_Logomark_-_Color_opxjpk.png"
    alt="Gas Padel Logo"
    className={cn('object-contain', className)}
  />
);
