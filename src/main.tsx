import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Apply fresh assets immediately when a new SW is available.
    updateSW(true);
  },
});

// Periodically re-check updates while app is open (helps installed PWA sessions).
window.setInterval(() => {
  updateSW(false);
}, 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
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
