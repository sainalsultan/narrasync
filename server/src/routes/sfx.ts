import type { FastifyPluginAsync } from 'fastify';
import { UploadLicenseFields } from '@narrasync/shared';
import { readUpload, sendAudio } from '../lib/http.ts';
import type { Services } from '../services.ts';

export const sfxRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    app.get('/sfx', async () => s.sfx.list());

    app.get('/sfx/:id/audio', async (req, reply) =>
      sendAudio(reply, await s.sfx.resolvePath((req.params as { id: string }).id)),
    );

    app.post('/sfx', async (req) => {
      const { filename, data, fields } = await readUpload(req);
      return s.sfx.upload(filename, data, UploadLicenseFields.parse(fields));
    });
  };
