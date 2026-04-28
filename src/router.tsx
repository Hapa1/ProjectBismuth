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
import { slideRegistry as geometryDeckRegistry } from './slides/registry';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <SlideshowView registry={presentationV2Registry} />,
});

const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/demo',
  component: () => <SlideshowView registry={geometryDeckRegistry} />,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectView,
});

const routeTree = rootRoute.addChildren([indexRoute, demoRoute, projectRoute]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundView,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
