import { createHashRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { Trips } from '@/screens/Trips';
import { TripView } from '@/screens/TripView';

// HashRouter (C2): works identically at a GitHub Pages subpath and under
// capacitor://localhost, with no server rewrite rules.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Trips /> },
      { path: 'trip/:tripId', element: <TripView /> },
    ],
  },
]);
