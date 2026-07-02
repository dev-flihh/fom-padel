import { useEffect } from 'react';

const LOADING_SCREEN_ORANGE = '#ff5500';

export const AppLoadingScreen = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const hadHtmlClass = html.classList.contains('app-loading');
    const hadBodyClass = body.classList.contains('app-loading');
    const hadRootClass = root?.classList.contains('app-loading') ?? false;
    html.style.backgroundColor = LOADING_SCREEN_ORANGE;
    body.style.backgroundColor = LOADING_SCREEN_ORANGE;
    html.classList.add('app-loading');
    body.classList.add('app-loading');
    root?.classList.add('app-loading');

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      if (!hadHtmlClass) html.classList.remove('app-loading');
      if (!hadBodyClass) body.classList.remove('app-loading');
      if (root && !hadRootClass) root.classList.remove('app-loading');
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[220] overflow-hidden"
      style={{
        backgroundColor: LOADING_SCREEN_ORANGE
      }}
    >
      <img
        src="/loading-screen.png"
        alt="FOM Play loading"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div
        aria-hidden="true"
        className="absolute left-0 right-0"
        style={{
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 140px)',
          height: 'calc(env(safe-area-inset-bottom, 0px) + 180px)',
          backgroundColor: LOADING_SCREEN_ORANGE
        }}
      />
    </div>
  );
};
