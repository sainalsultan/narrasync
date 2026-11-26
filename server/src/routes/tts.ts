import type { FastifyPluginAsync } from 'fastify';
import { TtsProviderId, TtsRequest } from '@narrasync/shared';
import type { Services } from '../services.ts';

export const ttsRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    app.get('/tts/voices', async (req) => {
      const { provider } = req.query as { provider?: string };
      return s.tts.get(TtsProviderId.parse(provider ?? 'edge')).listVoices();
    });

    /** Generate (or fetch from cache) the narration clip for one act. */
    app.post('/tts', async (req) => s.clips.synthesize(TtsRequest.parse(req.body)));
  };
