// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes - use server rendering instead of prerendering
  {
    path: 'product-details/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'checkout/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'auth/**',
    renderMode: RenderMode.Server,
  },
  // Static routes - can be prerendered
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
