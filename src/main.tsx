import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const isAppRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');
const isStandaloneDisplayMode =
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.matchMedia?.('(display-mode: minimal-ui)').matches
  || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let swRegistration: ServiceWorkerRegistration | undefined;
type FomUpdateWindow = Window & {
  __fomUpdateAvailable?: boolean;
  __fomApplyServiceWorkerUpdate?: () => Promise<void>;
};
const fomUpdateWindow = window as FomUpdateWindow;

const notifyAppUpdateAvailable = () => {
  fomUpdateWindow.__fomUpdateAvailable = true;
  fomUpdateWindow.__fomApplyServiceWorkerUpdate = () => (
    updateSW ? updateSW(true) : Promise.resolve()
  );
  window.dispatchEvent(new CustomEvent('fom-play:update-available'));
};

if (isAppRoute && isStandaloneDisplayMode) {
  updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration;
    },
    onNeedRefresh() {
      // Do not force-refresh the app while Firebase Auth may be using
      // sessionStorage for an OAuth popup/redirect handshake.
      notifyAppUpdateAvailable();
    },
  });
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => (
    Promise.all(registrations.map((registration) => registration.unregister()))
  )).then(async () => {
    if (!('caches' in window)) return;
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }).catch((error) => {
    console.warn('Marketing cache cleanup failed:', error);
  });
}

// Periodically re-check updates while app is open (helps installed PWA sessions).
window.setInterval(() => {
  void swRegistration?.update();
}, 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && swRegistration) {
    void swRegistration.update();
  }
});

// Prevent accidental zoom (pinch / double-tap) for app-like UX on mobile.
document.addEventListener(
  'gesturestart',
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
