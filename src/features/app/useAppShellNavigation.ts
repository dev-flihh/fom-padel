import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { isAppShellQuery } from '../../appBootstrap';
import { resolveTopLevelRoute, type TopLevelRoute } from '../../marketing';
import type { Screen } from '../../types';

type UseAppShellNavigationParams = {
  isAppShellRoute: boolean;
  isLoggedIn: boolean;
  screen: Screen;
  marketingBasePath: string;
  sharedTargetScreen: Screen;
  isAuthResolvedRef: MutableRefObject<boolean>;
  setTopLevelRoute: Dispatch<SetStateAction<TopLevelRoute>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
};

export const useAppShellNavigation = ({
  isAppShellRoute,
  isLoggedIn,
  screen,
  marketingBasePath,
  sharedTargetScreen,
  isAuthResolvedRef,
  setTopLevelRoute,
  setScreen,
}: UseAppShellNavigationParams) => {
  const isHandlingPopStateRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);

  useEffect(() => {
    if (!isAppShellRoute) return;
    if (!isAuthResolvedRef.current) return;
    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      return;
    }

    const currentState = window.history.state;
    const nextState = { __fomPlay: true, screen };

    if (currentState?.__fomPlay && currentState.screen === screen) return;

    if (!currentState?.__fomPlay) {
      window.history.replaceState(nextState, '');
      return;
    }

    window.history.pushState(nextState, '');
  }, [isAppShellRoute, isAuthResolvedRef, screen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const forceAppShell = isAppShellQuery(params);
      const nextRoute = resolveTopLevelRoute(window.location.pathname, forceAppShell, marketingBasePath);
      setTopLevelRoute(nextRoute);

      if (nextRoute !== 'app' && !forceAppShell) {
        return;
      }

      const targetScreen = event.state?.__fomPlay?.screen || event.state?.screen;
      if (targetScreen) {
        isHandlingPopStateRef.current = true;
        setScreen(targetScreen as Screen);
        return;
      }

      if (isLoggedIn) {
        isHandlingPopStateRef.current = true;
        setScreen('dashboard');
        window.history.replaceState({ __fomPlay: true, screen: 'dashboard' }, '');
      } else {
        isHandlingPopStateRef.current = true;
        const fallbackScreen = params.get('shared') ? sharedTargetScreen : 'login';
        setScreen(fallbackScreen);
        window.history.replaceState({ __fomPlay: true, screen: fallbackScreen }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, marketingBasePath, setScreen, setTopLevelRoute, sharedTargetScreen]);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (!event.touches?.length) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, ts: Date.now() };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current || !event.changedTouches?.length) return;
      const start = touchStartRef.current;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      const dt = Date.now() - start.ts;
      touchStartRef.current = null;

      // iOS-like edge swipe from left to go back.
      const isEdgeSwipeBack = start.x <= 28 && dx > 90 && dy < 70 && dt < 900;
      if (isEdgeSwipeBack) {
        window.history.back();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
};
