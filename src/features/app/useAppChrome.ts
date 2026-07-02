import { useEffect } from 'react';
import {
  getScreenRoute,
  resolveTrackableButton,
  resolveTrackableClick,
  syncAnalyticsUser,
  trackButtonClick,
  trackPageScroll,
  trackPageView,
  trackTrackerClick,
} from '../../analytics';
import {
  PUBLIC_PAGE_META,
  PUBLIC_SOCIAL_IMAGE_PATH,
  getCanonicalUrlForRoute,
  getPublicStructuredData,
  getTopLevelPath,
  type PublicTopLevelRoute,
  type TopLevelRoute,
} from '../../marketing';
import type { Screen, Tournament, TournamentHistory } from '../../types';

const APP_DESCRIPTION = 'Buka FOM Play untuk mengelola game padel, live score, klasemen, dan ranking pemain.';
const BROWSER_CHROME_COLOR = '#ffffff';

type UseAppChromeParams = {
  isAppShellRoute: boolean;
  isArchivedMarketingRoute: boolean;
  screen: Screen;
  publicRoute: PublicTopLevelRoute;
  topLevelRoute: TopLevelRoute;
  marketingBasePath: string;
  userUid: string | null | undefined;
  tournament: Tournament;
  activeScreenTournament: Tournament | null;
  selectedKlasemenTournament: Tournament | TournamentHistory | null;
  selectedHistoryId?: string | null;
  selectedKlasemenTournamentId?: string | null;
  activeScreenTournamentId?: string | null;
};

export const useAppChrome = ({
  isAppShellRoute,
  isArchivedMarketingRoute,
  screen,
  publicRoute,
  topLevelRoute,
  marketingBasePath,
  userUid,
  tournament,
  activeScreenTournament,
  selectedKlasemenTournament,
  selectedHistoryId,
  selectedKlasemenTournamentId,
  activeScreenTournamentId,
}: UseAppChromeParams) => {
  useEffect(() => {
    if (!isAppShellRoute) return;
    trackPageView(screen, getScreenRoute(screen));
  }, [isAppShellRoute, screen]);

  useEffect(() => {
    if (isAppShellRoute) return;
    trackPageView(publicRoute, getTopLevelPath(publicRoute, marketingBasePath));
  }, [isAppShellRoute, marketingBasePath, publicRoute]);

  useEffect(() => {
    void syncAnalyticsUser(userUid || null);
  }, [userUid]);

  useEffect(() => {
    const currentScreen = isAppShellRoute ? screen : publicRoute;
    const currentRoute = isAppShellRoute ? getScreenRoute(screen) : getTopLevelPath(publicRoute, marketingBasePath);

    const handleDocumentClick = (event: MouseEvent) => {
      if (isAppShellRoute) {
        const trackedButton = resolveTrackableButton(event.target);
        if (trackedButton) {
          trackButtonClick({
            screen: currentScreen,
            route: currentRoute,
            buttonName: trackedButton.buttonName,
            buttonText: trackedButton.buttonText,
          });
          return;
        }
      }

      const tracked = resolveTrackableClick(event.target);
      if (!tracked) return;
      trackTrackerClick({
        screen: currentScreen,
        route: currentRoute,
        clickName: tracked.clickName,
        clickText: tracked.clickText,
        clickType: tracked.clickType,
        targetUrl: tracked.targetUrl,
        section: tracked.section,
      });
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [isAppShellRoute, marketingBasePath, publicRoute, screen]);

  useEffect(() => {
    const currentScreen = isAppShellRoute ? screen : publicRoute;
    const currentRoute = isAppShellRoute ? getScreenRoute(screen) : getTopLevelPath(publicRoute, marketingBasePath);
    const milestones = [25, 50, 75, 90, 100];
    const trackedMilestones = new Set<number>();
    let maxDepth = 0;
    let ticking = false;

    const getScrollPercent = () => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      const scrollTop = window.scrollY || scrollingElement.scrollTop || document.body.scrollTop || 0;
      const scrollableHeight = Math.max(1, scrollingElement.scrollHeight - window.innerHeight);
      return Math.min(100, Math.max(0, Math.round((scrollTop / scrollableHeight) * 100)));
    };

    const checkScrollDepth = () => {
      ticking = false;
      const scrollPercent = getScrollPercent();
      maxDepth = Math.max(maxDepth, scrollPercent);

      milestones.forEach((milestone) => {
        if (trackedMilestones.has(milestone) || scrollPercent < milestone) return;
        trackedMilestones.add(milestone);
        trackPageScroll({
          screen: currentScreen,
          route: currentRoute,
          milestone,
          scrollPercent,
          maxScrollDepth: maxDepth,
        });
      });
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(checkScrollDepth);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    checkScrollDepth();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isAppShellRoute, marketingBasePath, publicRoute, screen]);

  useEffect(() => {
    if (!isAppShellRoute) return;
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const rafId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [isAppShellRoute, screen, selectedHistoryId, selectedKlasemenTournamentId, activeScreenTournamentId]);

  useEffect(() => {
    if (isAppShellRoute) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [isAppShellRoute, topLevelRoute]);

  useEffect(() => {
    if (!isAppShellRoute) {
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.setAttribute('content', BROWSER_CHROME_COLOR);
      document.documentElement.style.backgroundColor = BROWSER_CHROME_COLOR;
      document.body.style.backgroundColor = BROWSER_CHROME_COLOR;
      return;
    }

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', BROWSER_CHROME_COLOR);
    document.documentElement.style.backgroundColor = BROWSER_CHROME_COLOR;
    document.body.style.backgroundColor = BROWSER_CHROME_COLOR;
  }, [activeScreenTournament, isAppShellRoute, screen, selectedKlasemenTournament, tournament]);

  useEffect(() => {
    const title = isAppShellRoute ? 'FOM Play App' : PUBLIC_PAGE_META[publicRoute].title;
    document.title = title;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute(
      'content',
      isAppShellRoute ? APP_DESCRIPTION : PUBLIC_PAGE_META[publicRoute].description,
    );
  }, [isAppShellRoute, publicRoute]);

  useEffect(() => {
    const canonicalHref = isAppShellRoute
      ? `${window.location.origin}${window.location.pathname}`
      : getCanonicalUrlForRoute(publicRoute, marketingBasePath);
    const pageTitle = isAppShellRoute ? 'FOM Play App' : PUBLIC_PAGE_META[publicRoute].title;
    const pageDescription = isAppShellRoute ? APP_DESCRIPTION : PUBLIC_PAGE_META[publicRoute].description;
    const socialImage = `${window.location.origin}${PUBLIC_SOCIAL_IMAGE_PATH}`;
    const ogType = isAppShellRoute ? 'website' : publicRoute === 'home' ? 'website' : 'article';

    const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string, content: string) => {
      let metaTag = document.querySelector(selector) as HTMLMetaElement | null;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, value);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    };

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalHref;

    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      isAppShellRoute || isArchivedMarketingRoute ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large',
    );
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalHref);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'FOM Play');
    upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'id_ID');
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', socialImage);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'FOM Play padel app preview');
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', socialImage);

    let schemaScript = document.getElementById('fom-structured-data') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'fom-structured-data';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = isAppShellRoute ? '' : JSON.stringify(getPublicStructuredData(publicRoute, marketingBasePath));

    return () => {
      if (schemaScript) schemaScript.textContent = '';
    };
  }, [isAppShellRoute, isArchivedMarketingRoute, marketingBasePath, publicRoute]);
};
