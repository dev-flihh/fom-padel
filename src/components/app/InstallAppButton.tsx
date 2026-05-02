import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const detectIOSDevice = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  const isiPhoneOrIPad = /iphone|ipad|ipod/.test(ua);
  const isiPadOSDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isiPhoneOrIPad || isiPadOSDesktop;
};

export const InstallAppButton = ({
  className,
  compact = false,
  variant = 'pill'
}: {
  className?: string;
  compact?: boolean;
  variant?: 'pill' | 'minimum';
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const isIos = useMemo(() => detectIOSDevice(), []);

  useEffect(() => {
    const checkStandalone = () => {
      const byDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches;
      const byNavigator = Boolean((window.navigator as any).standalone);
      setIsStandalone(Boolean(byDisplayMode || byNavigator));
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    checkStandalone();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      window.alert('For iPhone/iPad: open the Share menu in Safari, then choose "Add to Home Screen".');
      return;
    }

    window.alert('Open your browser menu, then choose "Install app" or "Add to Home screen".');
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstall}
      className={cn(
        "tap-target inline-flex items-center justify-center gap-1.5 font-semibold",
        variant === 'pill'
          ? cn(
            "h-9 rounded-full border",
            compact ? "px-2.5 text-[11px]" : "px-3 text-[12px]"
          )
          : cn(
            "h-8 rounded-none border-0 bg-transparent",
            compact ? "px-0 text-[12px]" : "px-0 text-[13px]"
          ),
        className
      )}
      aria-label="Install app"
    >
      <Download size={15} />
      <span>{compact ? 'Install' : 'Install App'}</span>
    </button>
  );
};
