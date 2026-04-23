import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const isAppRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

if (isAppRoute) {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Do not force-refresh the app while Firebase Auth may be using
      // sessionStorage for an OAuth popup/redirect handshake.
      updateSW?.(false);
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
  updateSW?.(false);
}, 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && updateSW) {
    updateSW(false);
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
