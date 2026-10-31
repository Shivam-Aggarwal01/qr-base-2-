import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import DemoApp from './DemoApp';
import './index.css';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const AuthenticatedApp = React.lazy(() => import('./app/App').then(({ App }) => ({ default: App })));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        {isDemoMode ? (
          <DemoApp />
        ) : (
          <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading app…</div>}>
            <AuthenticatedApp />
          </React.Suspense>
        )}
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
