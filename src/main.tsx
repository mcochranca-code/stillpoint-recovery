import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import './styles.css';
import './styles/motion.css';
import './styles/atmosphere.css';
import './styles/readings.css';
import './styles/refresh.css';
import { captureInstallPrompt } from './platform/installPrompt';

// Hold the browser's install prompt so it can be offered after a meaningful moment, not on first load.
captureInstallPrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The application remains fully usable if service-worker registration is unavailable.
    });
  });
}
