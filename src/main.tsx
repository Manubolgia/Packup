import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { isNativeRuntime } from '@/platform';
import { UpdateToast } from '@/components/UpdateToast';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root missing from index.html');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
    {/* Spec §6: no service worker under Capacitor — the WebView would serve a
        stale bundle over the one shipped inside the app binary. */}
    {isNativeRuntime ? null : <UpdateToast />}
  </StrictMode>,
);
