import { existsSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import path from 'node:path';
import { type Project, type Timeline, computeTimeline } from '@narrasync/shared';
import type { FfmpegRunner } from '../audio/ffmpeg.ts';
import { type MixInput, buildMixArgs } from '../audio/mix.ts';
import type { ClipStore } from '../clips/clip-store.ts';
import { badRequest } from '../lib/errors.ts';
import { ensureDir } from '../lib/fs.ts';
import { shortHash } from '../lib/hash.ts';
import type { SfxLibrary } from '../sfx/library.ts';

export interface RenderResult {
  /** Absolute path of the rendered MP3 (cached by content). */
  file: string;
  timeline: Timeline;
  warnings: string[];
}

/** Turns a project into a single narration + SFX MP3. */
export class Renderer {
  private readonly dir: string;

  constructor(
    cacheDir: string,
    private readonly ffmpeg: FfmpegRunner,
    private readonly clips: ClipStore,
    private readonly sfx: SfxLibrary,
  ) {
    this.dir = path.join(cacheDir, 'renders');
  }

  async render(project: Project): Promise<RenderResult> {
    if (project.acts.length === 0) throw badRequest('Project belum punya act');
    const warnings: string[] = [];
    const durations = new Map<string, number>();
    const clipFiles = new Map<string, string>();

    for (const [i, act] of project.acts.entries()) {
      if (!act.clip) {
        if (act.text.trim()) warnings.push(`Act ${i + 1} belum punya clip suara (hanya efek suara).`);
        continue;
      }
      const { ref, path: file } = await this.clips.get(act.clip.id);
      durations.set(act.id, ref.duration); // server-measured duration is authoritative
      clipFiles.set(act.id, file);
      if (!ref.license.commercial) warnings.push(`Act ${i + 1}: clip belum berlisensi komersial.`);
      if (ref.text !== undefined && ref.text.trim() !== act.text.trim()) {
        warnings.push(`Act ${i + 1}: naskah berubah sejak clip di-generate.`);
      }
    }

    const timeline = computeTimeline(project, durations);
    const inputs: MixInput[] = [];
    for (const act of timeline.acts) {
      const file = clipFiles.get(act.actId);
      if (file && act.narrationStart !== null) inputs.push({ file, at: act.narrationStart, gain: 1 });
    }
    for (const cue of timeline.cues) {
      if (cue.gain <= 0) continue;
      inputs.push({ file: await this.sfx.resolvePath(cue.sfx), at: cue.start, gain: cue.gain });
    }

    await ensureDir(this.dir);
    const file = path.join(this.dir, `${shortHash(JSON.stringify({ inputs, total: timeline.total }))}.mp3`);
    if (!existsSync(file)) {
      const tmp = `${file}.part.mp3`;
      await this.ffmpeg.run(buildMixArgs(inputs, timeline.total, tmp));
      await rename(tmp, file);
    }
    return { file, timeline, warnings };
  }
}
