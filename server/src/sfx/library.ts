import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BUILTIN_SFX, type LicenseInfo, type SfxMeta, isBuiltinSfx } from '@narrasync/shared';
import type { FfmpegRunner } from '../audio/ffmpeg.ts';
import { encodeWav } from '../audio/wav.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { SAFE_ID, ensureDir, readJson, writeFileAtomic, writeJson } from '../lib/fs.ts';
import { shortHash } from '../lib/hash.ts';
import { SAMPLE_RATE } from './dsp.ts';
import { SFX_RECIPES } from './recipes.ts';

/** Bump when a recipe changes so cached WAVs are regenerated. */
const RECIPE_VERSION = 1;
const AUDIO_EXT = new Set(['wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac']);
const SYNTH_LICENSE: LicenseInfo = { commercial: true, source: 'Sintetis (rumus, tanpa sampel)', license: 'Bawaan NarraSync' };

interface StoredSfx {
  meta: SfxMeta;
  file: string;
}

export class SfxLibrary {
  private readonly builtinDir: string;
  private readonly uploadDir: string;
  private builtinMeta: SfxMeta[] | null = null;

  constructor(
    cacheDir: string,
    private readonly ffmpeg: FfmpegRunner,
  ) {
    this.builtinDir = path.join(cacheDir, 'sfx', `builtin-v${RECIPE_VERSION}`);
    this.uploadDir = path.join(cacheDir, 'sfx', 'uploads');
  }

  /** Synthesise all built-in effects to WAV once (cheap: < 1 s total). */
  async init(): Promise<void> {
    await ensureDir(this.builtinDir);
    await ensureDir(this.uploadDir);
    this.builtinMeta = [];
    for (const id of BUILTIN_SFX) {
      const samples = SFX_RECIPES[id]();
      const file = path.join(this.builtinDir, `${id}.wav`);
      if (!existsSync(file)) await writeFile(file, encodeWav(samples, SAMPLE_RATE));
      this.builtinMeta.push({
        id,
        name: id.replace('_', ' '),
        kind: 'builtin',
        duration: samples.length / SAMPLE_RATE,
        license: SYNTH_LICENSE,
      });
    }
  }

  async list(): Promise<SfxMeta[]> {
    const uploads: SfxMeta[] = [];
    for (const name of await readdir(this.uploadDir).catch(() => [])) {
      if (!name.endsWith('.json')) continue;
      const stored = await readJson<StoredSfx>(path.join(this.uploadDir, name));
      if (stored) uploads.push(stored.meta);
    }
    uploads.sort((a, b) => a.name.localeCompare(b.name));
    return [...(this.builtinMeta ?? []), ...uploads];
  }

  /** Absolute path of the audio file for an sfx id. */
  async resolvePath(id: string): Promise<string> {
    if (isBuiltinSfx(id)) return path.join(this.builtinDir, `${id}.wav`);
    if (!SAFE_ID.test(id)) throw badRequest(`Id efek suara tidak valid: ${id}`);
    const stored = await readJson<StoredSfx>(path.join(this.uploadDir, `${id}.json`));
    if (!stored) throw notFound(`Efek suara "${id}" tidak ditemukan`);
    return path.join(this.uploadDir, stored.file);
  }

  async upload(filename: string, data: Buffer, license: LicenseInfo): Promise<SfxMeta> {
    const ext = path.extname(filename).slice(1).toLowerCase();
    if (!AUDIO_EXT.has(ext)) throw badRequest(`Format tidak didukung: .${ext} (pakai WAV/MP3)`);
    const id = `u-${shortHash(data)}`;
    const file = `${id}.${ext}`;
    const abs = path.join(this.uploadDir, file);
    await writeFileAtomic(abs, data);
    const duration = await this.ffmpeg.probeDuration(abs);
    const meta: SfxMeta = {
      id,
      name: path.basename(filename, path.extname(filename)).slice(0, 40),
      kind: 'upload',
      duration,
      license,
    };
    await writeJson(path.join(this.uploadDir, `${id}.json`), { meta, file } satisfies StoredSfx);
    return meta;
  }
}
