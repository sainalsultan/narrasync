import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '@narrasync/shared';
import { HttpError } from './lib/errors.ts';
import { clipRoutes } from './routes/clips.ts';
import { projectRoutes } from './routes/projects.ts';
import { renderRoutes } from './routes/render.ts';
import { sfxRoutes } from './routes/sfx.ts';
import { systemRoutes } from './routes/system.ts';
import { ttsRoutes } from './routes/tts.ts';
import type { Services } from './services.ts';

const WEB_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

export async function buildApp(services: Services, opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 10 * 1024 * 1024 });

  await app.register(cors, { origin: services.config.corsOrigins, exposedHeaders: ['X-Total-Length', 'X-Act-Lengths'] });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

  app.setErrorHandler((err, req, reply) => {
    let status = 500;
    let body: ApiError = { error: 'Terjadi kesalahan di server' };
    if (err instanceof ZodError) {
      status = 400;
      body = { error: err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '), details: err.issues };
    } else if (err instanceof HttpError) {
      status = err.statusCode;
      body = { error: err.message, details: err.details };
    } else if (typeof (err as { statusCode?: number }).statusCode === 'number' && (err as { statusCode: number }).statusCode < 500) {
      status = (err as { statusCode: number }).statusCode;
      body = { error: (err as Error).message };
    } else {
      req.log.error(err);
      body = { error: (err as Error).message || body.error };
    }
    reply.status(status).send(body);
  });

  await app.register(
    async (api) => {
      for (const routes of [systemRoutes, ttsRoutes, clipRoutes, sfxRoutes, projectRoutes, renderRoutes]) {
        await api.register(routes(services));
      }
    },
    { prefix: '/api' },
  );

  // Production: serve the built web app from the same origin.
  if (existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, { root: WEB_DIST });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api') ? reply.status(404).send({ error: 'Not found' }) : reply.sendFile('index.html'),
    );
  }

  return app;
}
