import { createHashRouter, type RouteObject } from 'react-router';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Hash routing (plan §23.1): GitHub Pages never sees the route, so refreshes never 404.
// Home ships in the main chunk; everything else is code-split.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'cemetery/:cemeteryId',
        lazy: async () => ({ Component: (await import('./pages/CemeteryPage')).CemeteryPage }),
      },
      {
        path: 'settings',
        lazy: async () => ({ Component: (await import('./pages/SettingsPage')).SettingsPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
