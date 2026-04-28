import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';
import { LandingView } from './views/LandingView';
import { ProjectView } from './views/ProjectView';
import { NotFoundView } from './views/NotFoundView';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingView,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectView,
});

const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundView,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
