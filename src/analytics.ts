import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analyticsPromise } from './firebase';
import type { Screen } from './types';

type TrackButtonClickInput = {
  screen: Screen | string;
  buttonName: string;
  buttonText?: string;
  route?: string;
};

const DEFAULT_APP_NAME = 'fom_play';
type AppSurface = 'ios_web' | 'ios_pwa' | 'android_web' | 'android_pwa' | 'desktop_web' | 'unknown';

const toSnakeCase = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 100);

const sanitizeText = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 120);

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isiPhoneOrIPad = /iphone|ipad|ipod/.test(ua);
  const isiPadOSDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isiPhoneOrIPad || isiPadOSDesktop;
};

const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
};

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    ((window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
};

export const getAppSurface = (): AppSurface => {
  if (typeof window === 'undefined') return 'unknown';

  const pwa = isStandalonePwa();
  if (isIOS()) return pwa ? 'ios_pwa' : 'ios_web';
  if (isAndroid()) return pwa ? 'android_pwa' : 'android_web';
  return 'desktop_web';
};

const logAnalyticsEvent = async (eventName: string, params: Record<string, unknown>) => {
  const analytics = await analyticsPromise;
  if (!analytics) return;

  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  logEvent(analytics, eventName, cleanedParams);
};

export const getScreenRoute = (screen: Screen | string) => `/${toSnakeCase(screen) || 'unknown'}`;

export const syncAnalyticsUser = async (userId?: string | null) => {
  const analytics = await analyticsPromise;
  if (!analytics) return;

  setUserId(analytics, userId || null);
  setUserProperties(analytics, {
    app_surface: getAppSurface()
  });
};

export const trackPageView = (screen: Screen | string, route?: string) => {
  const screenName = toSnakeCase(screen) || 'unknown';
  const pagePath = route || getScreenRoute(screen);

  void logAnalyticsEvent('page_view', {
    screen_name: screenName,
    page_title: `${DEFAULT_APP_NAME}_${screenName}`,
    page_path: pagePath,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    app_surface: getAppSurface()
  });
};

export const trackButtonClick = ({ screen, buttonName, buttonText, route }: TrackButtonClickInput) => {
  const screenName = toSnakeCase(screen) || 'unknown';
  const normalizedButtonName = toSnakeCase(buttonName);
  if (!normalizedButtonName) return;

  void logAnalyticsEvent('button_click', {
    screen_name: screenName,
    page_path: route || getScreenRoute(screen),
    button_name: `${screenName}__${normalizedButtonName}`,
    button_text: buttonText ? sanitizeText(buttonText) : undefined,
    app_surface: getAppSurface()
  });
};

const readButtonDescriptor = (element: HTMLElement) => {
  const analyticsId = element.getAttribute('data-analytics-id');
  if (analyticsId) return analyticsId;

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const title = element.getAttribute('title');
  if (title) return title;

  const id = element.getAttribute('id');
  if (id) return id;

  const text = sanitizeText(element.textContent || '');
  return text || null;
};

export const resolveTrackableButton = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return null;

  const button = target.closest('button, [role="button"]');
  if (!(button instanceof HTMLElement)) return null;

  const descriptor = readButtonDescriptor(button);
  if (!descriptor) return null;

  return {
    buttonName: descriptor,
    buttonText: sanitizeText(button.textContent || '')
  };
};
