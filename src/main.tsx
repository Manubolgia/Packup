import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { isNativeRuntime } from '@/platform';
import { UpdateToast } from '@/components/UpdateToast';
import { Toaster } from '@/components/ui/Toaster';
// Self-hosted so the app never touches a font CDN at runtime (C1). Latin
// subsets only: the full set ships Vietnamese/Cyrillic faces the UI never uses,
// and every one of them would be precached for offline.
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root missing from index.html');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster />
    {/* Spec §6: no service worker under Capacitor — the WebView would serve a
        stale bundle over the one shipped inside the app binary. */}
    {isNativeRuntime ? null : <UpdateToast />}
  </StrictMode>,
);
