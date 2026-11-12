import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Global handler for Vite dynamic preload errors (when chunk hash changes after deployment)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const reloadKey = 'crestflow_preload_reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem(reloadKey, now.toString());
      window.location.reload();
    }
  });

  // Register PWA Service Worker for offline capability and browser install popup
  if ('serviceWorker' in navigator && (import.meta.env.PROD || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for worker updates
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[PWA] New version available');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary fallbackTitle="An unexpected application error occurred">
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
