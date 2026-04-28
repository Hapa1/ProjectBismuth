import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';
import { SlideshowView } from './views/SlideshowView';
import { ProjectView } from './views/ProjectView';
import { NotFoundView } from './views/NotFoundView';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: SlideshowView,
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
