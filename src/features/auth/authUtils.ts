export const getPasswordResetActionSettings = () => {
  if (typeof window === 'undefined') return undefined;
  return {
    url: `${window.location.origin}/app`,
    handleCodeInApp: false
  };
};

export const getProviderLabel = (providerId?: string) => {
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'apple.com') return 'Apple';
  if (providerId === 'password') return 'email and password';
  return 'another sign-in method';
};

export const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const canUseSessionStorage = () => {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__fom_auth_storage_check__';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const getSocialAuthBrowserWarning = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  if (!canUseSessionStorage()) {
    return 'Google or Apple login cannot continue because this browser blocks temporary login storage. Please open FOM Play in Chrome or Safari, or use email login.';
  }

  const ua = navigator.userAgent.toLowerCase();
  const referrer = (document.referrer || '').toLowerCase();
  const isAndroidWebView = /\bwv\b/.test(ua) || /; wv\)/.test(ua);
  const isStandalonePwa = window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: minimal-ui)').matches
    || ((navigator as Navigator & { standalone?: boolean }).standalone === true)
    || referrer.startsWith('android-app://');
  const isInAppBrowser = /fbav|fban|fb_iab|instagram|line\/|micromessenger|tiktok|twitter|linkedinapp|whatsapp|telegram|snapchat|messenger|gsa\//.test(ua);

  if (isStandalonePwa) {
    return 'Google or Apple login is not supported from the installed app view. Please open FOM Play in Chrome or Safari, or use email login.';
  }

  if (isAndroidWebView || isInAppBrowser) {
    return 'Google or Apple login may fail in this in-app browser. Please open FOM Play in Chrome or Safari, or use email login.';
  }

  return null;
};
