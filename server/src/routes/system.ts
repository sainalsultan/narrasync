import type { FastifyPluginAsync } from 'fastify';
import type { HealthResponse } from '@narrasync/shared';
import type { Services } from '../services.ts';

export const systemRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    app.get('/health', async (): Promise<HealthResponse> => ({
      ok: true,
      mode: s.config.mode,
      ffmpeg: await s.ffmpeg.version(),
      providers: s.tts.list().map((p) => ({ id: p.id, name: p.name, commercial: p.commercial })),
    }));
  };
