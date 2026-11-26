import type { FastifyPluginAsync } from 'fastify';
import { Project } from '@narrasync/shared';
import type { Services } from '../services.ts';

export const projectRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    app.get('/projects', async () => s.projects.list());
    app.get('/projects/:slug', async (req) => s.projects.get((req.params as { slug: string }).slug));
    app.put('/projects', async (req) => s.projects.save(Project.parse(req.body)));
  };
