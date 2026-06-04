import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from './App';
import './index.css';

const rootRoute = createRootRoute({
  component: App
});

const routePaths = ['/', '/courses', '/applications', '/users', '/admins', '/schemas', '/bot'] as const;

const routeTree = rootRoute.addChildren(
  routePaths.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null
    })
  )
);

const router = createRouter({
  routeTree,
  basepath: '/admin'
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
