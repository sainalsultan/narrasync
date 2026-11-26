import type { FastifyPluginAsync } from 'fastify';
import { type ExportResult, Project, renderVoiceTimingTs, slugify } from '@narrasync/shared';
import { forbidden } from '../lib/errors.ts';
import { sendAudio } from '../lib/http.ts';
import { writeMotionCanvasOutputs } from '../render/motion-canvas.ts';
import type { Services } from '../services.ts';

export const renderRoutes =
  (s: Services): FastifyPluginAsync =>
  async (app) => {
    /** Render and stream the mixed MP3 (works in local and hosted mode). */
    app.post('/render', async (req, reply) => {
      const project = Project.parse(req.body);
      const { file, timeline } = await s.renderer.render(project);
      reply.header('X-Total-Length', String(timeline.total));
      reply.header('X-Act-Lengths', timeline.actLengths.join(','));
      return sendAudio(reply, file, { downloadName: `${slugify(project.name)}-voiceover.mp3` });
    });

    /** Local mode: write audio/voiceover.mp3 + src/voice-timing.ts into the Motion Canvas project. */
    app.post('/export', async (req): Promise<ExportResult> => {
      if (s.config.mode !== 'local') throw forbidden('Ekspor ke folder hanya tersedia di mode lokal; gunakan unduhan.');
      const project = Project.parse(req.body);
      const { file, timeline, warnings } = await s.renderer.render(project);
      const written = await writeMotionCanvasOutputs(
        project.targetDir,
        file,
        renderVoiceTimingTs(timeline, project.name),
      );
      return {
        files: written.files,
        actLengths: timeline.actLengths,
        total: timeline.total,
        warnings: [...warnings, ...written.warnings],
      };
    });
  };
