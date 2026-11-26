import path from 'node:path';
import type { ClipRef, LicenseInfo, TtsRequest } from '@narrasync/shared';
import type { FfmpegRunner } from '../audio/ffmpeg.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { SAFE_ID, ensureDir, readJson, writeFileAtomic, writeJson } from '../lib/fs.ts';
import { shortHash } from '../lib/hash.ts';
import type { TtsRegistry } from '../tts/registry.ts';

const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);

interface StoredClip {
  ref: ClipRef;
  file: string;
}

/**
 * Narration clips on disk: `cache/clips/<id>.<ext>` + `<id>.json`.
 * TTS clips are keyed by hash(provider, voice, rate, text) so unchanged
 * acts are never re-generated (replaces make_voice.py `--reuse`).
 */
export class ClipStore {
  private readonly dir: string;
  private readonly inflight = new Map<string, Promise<ClipRef>>();

  constructor(
    cacheDir: string,
    private readonly ffmpeg: FfmpegRunner,
    private readonly tts: TtsRegistry,
  ) {
    this.dir = path.join(cacheDir, 'clips');
  }

  async init(): Promise<void> {
    await ensureDir(this.dir);
  }

  static ttsId(req: TtsRequest): string {
    return `tts-${shortHash(req.provider, req.voice, req.rate, req.text.trim())}`;
  }

  /** Return the cached clip or synthesise it. Concurrent identical requests share one job. */
  async synthesize(req: TtsRequest): Promise<ClipRef & { cached: boolean }> {
    const id = ClipStore.ttsId(req);
    const existing = await this.read(id);
    if (existing) return { ...existing.ref, cached: true };

    let job = this.inflight.get(id);
    if (!job) {
      job = this.generate(id, req).finally(() => this.inflight.delete(id));
      this.inflight.set(id, job);
    }
    return { ...(await job), cached: false };
  }

  private async generate(id: string, req: TtsRequest): Promise<ClipRef> {
    const provider = this.tts.get(req.provider);
    const { audio, ext } = await provider.synthesize({ voice: req.voice, rate: req.rate, text: req.text.trim() });
    const file = `${id}.${ext}`;
    const abs = path.join(this.dir, file);
    await writeFileAtomic(abs, audio);
    const ref: ClipRef = {
      id,
      duration: await this.ffmpeg.probeDuration(abs),
      origin: req.provider,
      text: req.text,
      voice: req.voice,
      rate: req.rate,
      license: {
        commercial: provider.commercial,
        source: provider.name,
        license: provider.commercial ? 'Lisensi penyedia' : 'Belum berlisensi komersial',
      },
    };
    await writeJson(path.join(this.dir, `${id}.json`), { ref, file } satisfies StoredClip);
    return ref;
  }

  async saveUpload(filename: string, data: Buffer, license: LicenseInfo): Promise<ClipRef> {
    const ext = path.extname(filename).slice(1).toLowerCase();
    if (!AUDIO_EXT.has(ext)) throw badRequest(`Format tidak didukung: .${ext} (pakai MP3/WAV/M4A)`);
    const id = `up-${shortHash(data)}`;
    const file = `${id}.${ext}`;
    const abs = path.join(this.dir, file);
    await writeFileAtomic(abs, data);
    const ref: ClipRef = { id, duration: await this.ffmpeg.probeDuration(abs), origin: 'upload', license };
    await writeJson(path.join(this.dir, `${id}.json`), { ref, file } satisfies StoredClip);
    return ref;
  }

  async get(id: string): Promise<{ ref: ClipRef; path: string }> {
    const stored = await this.read(id);
    if (!stored) throw notFound(`Clip "${id}" tidak ditemukan di cache — generate atau upload ulang`);
    return { ref: stored.ref, path: path.join(this.dir, stored.file) };
  }

  private async read(id: string): Promise<StoredClip | null> {
    if (!SAFE_ID.test(id)) throw badRequest(`Id clip tidak valid: ${id}`);
    return readJson<StoredClip>(path.join(this.dir, `${id}.json`));
  }
}
