import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analyticsPromise } from './firebase';
import type { Screen } from './types';

type TrackButtonClickInput = {
  screen: Screen | string;
  buttonName: string;
  buttonText?: string;
  route?: string;
};

type TrackClickInput = {
  screen: Screen | string;
  clickName: string;
  clickText?: string;
  route?: string;
  targetUrl?: string;
  clickType?: string;
  section?: string;
};

type TrackPageScrollInput = {
  screen: Screen | string;
  route?: string;
  milestone: number;
  scrollPercent?: number;
  maxScrollDepth?: number;
};

type FirestoreDbRole = 'primary' | 'ephemeral';
type FirestoreOperation = 'read' | 'write' | 'delete' | 'listen' | 'skip' | 'error';
type TrackFirestoreRouteInput = {
  dbRole: FirestoreDbRole;
  collection: string;
  operation: FirestoreOperation;
  flow?: string;
  label?: string;
};

const DEFAULT_APP_NAME = 'fom_play';
type AppSurface = 'ios_web' | 'ios_pwa' | 'android_web' | 'android_pwa' | 'desktop_web' | 'unknown';
const seenFirestoreRouteEvents = new Set<string>();

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

  trackTrackerClick({
    screen,
    route,
    clickName: buttonName,
    clickText: buttonText,
    clickType: 'button'
  });
};

export const trackTrackerClick = ({
  screen,
  clickName,
  clickText,
  route,
  targetUrl,
  clickType,
  section
}: TrackClickInput) => {
  const screenName = toSnakeCase(screen) || 'unknown';
  const normalizedClickName = toSnakeCase(clickName);
  if (!normalizedClickName) return;

  void logAnalyticsEvent('tracker_click', {
    screen_name: screenName,
    page_path: route || getScreenRoute(screen),
    click_name: `${screenName}__${normalizedClickName}`,
    click_text: clickText ? sanitizeText(clickText) : undefined,
    click_type: clickType ? toSnakeCase(clickType) : undefined,
    target_url: targetUrl ? sanitizeText(targetUrl) : undefined,
    section: section ? toSnakeCase(section) : undefined,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    app_surface: getAppSurface()
  });
};

export const trackPageScroll = ({
  screen,
  route,
  milestone,
  scrollPercent,
  maxScrollDepth
}: TrackPageScrollInput) => {
  const screenName = toSnakeCase(screen) || 'unknown';

  void logAnalyticsEvent('page_scroll', {
    screen_name: screenName,
    page_path: route || getScreenRoute(screen),
    scroll_milestone: milestone,
    scroll_percent: scrollPercent,
    max_scroll_depth: maxScrollDepth,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    app_surface: getAppSurface()
  });
};

export const trackFirestoreRoute = ({
  dbRole,
  collection,
  operation,
  flow,
  label
}: TrackFirestoreRouteInput) => {
  const normalizedCollection = toSnakeCase(collection);
  if (!normalizedCollection) return;

  const normalizedFlow = flow ? toSnakeCase(flow) : undefined;
  const normalizedLabel = label ? toSnakeCase(label) : undefined;
  const dedupeKey = [
    dbRole,
    normalizedCollection,
    operation,
    normalizedFlow || '',
    normalizedLabel || ''
  ].join(':');
  if (seenFirestoreRouteEvents.has(dedupeKey)) return;
  seenFirestoreRouteEvents.add(dedupeKey);

  void logAnalyticsEvent('firestore_route', {
    db_role: dbRole,
    collection_name: normalizedCollection,
    firestore_operation: operation,
    flow_name: normalizedFlow,
    route_label: normalizedLabel,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
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

const readSectionName = (element: HTMLElement) => {
  const section = element.closest('[data-analytics-section], section[id], main, header, footer');
  if (!(section instanceof HTMLElement)) return null;

  return (
    section.getAttribute('data-analytics-section') ||
    section.getAttribute('id') ||
    section.tagName.toLowerCase()
  );
};

export const resolveTrackableClick = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return null;

  const element = target.closest('a, button, [role="button"], [data-analytics-id]');
  if (!(element instanceof HTMLElement)) return null;

  const descriptor = readButtonDescriptor(element);
  if (!descriptor) return null;

  const anchor = element instanceof HTMLAnchorElement ? element : element.closest('a');
  const clickType = anchor ? 'link' : (element.getAttribute('role') || element.tagName.toLowerCase());

  return {
    clickName: descriptor,
    clickText: sanitizeText(element.textContent || ''),
    clickType,
    targetUrl: anchor?.href,
    section: readSectionName(element) || undefined
  };
};
