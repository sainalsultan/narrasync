import type { FastifyPluginAsync } from 'fastify';
import { UploadLicenseFields } from '@narrasync/shared';
import { readUpload, sendAudio } from '../lib/http.ts';
import type { Services } from '../services.ts';

export const clipRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    /** Manual voice clip upload (multipart: commercial, source, license, file). */
    app.post('/clips', async (req) => {
      const { filename, data, fields } = await readUpload(req);
      return s.clips.saveUpload(filename, data, UploadLicenseFields.parse(fields));
    });

    app.get('/clips/:id/audio', async (req, reply) => {
      const { path } = await s.clips.get((req.params as { id: string }).id);
      return sendAudio(reply, path, { immutable: true });
    });
  };
