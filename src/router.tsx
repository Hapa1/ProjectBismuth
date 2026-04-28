import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';
import { SlideshowView } from './views/SlideshowView';
import { ProjectView } from './views/ProjectView';
import { NotFoundView } from './views/NotFoundView';
import { presentationV2Registry } from './slides/v2/registry';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <SlideshowView registry={presentationV2Registry} />,
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
