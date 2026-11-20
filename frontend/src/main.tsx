import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Automatically route relative /api calls to remote backend if VITE_API_BASE_URL is set in production
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${apiBase}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api') && input.origin === window.location.origin) {
      input = `${apiBase}${input.pathname}${input.search}`;
    }
    return originalFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
