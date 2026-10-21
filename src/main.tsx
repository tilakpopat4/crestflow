import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';

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
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
