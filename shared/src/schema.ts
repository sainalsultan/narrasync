import { z } from 'zod';

/**
 * Data model for `audio-project.json`.
 *
 * Kept backward compatible with the PRD example: `id` and `clip` fields are
 * optional on disk and filled in when the project is parsed.
 */

const newId = () => globalThis.crypto.randomUUID();

export const TTS_PROVIDERS = ['edge'] as const; // P1: 'azure', 'elevenlabs'
export const TtsProviderId = z.enum(TTS_PROVIDERS);
export type TtsProviderId = z.infer<typeof TtsProviderId>;

/** Edge-TTS style rate string, e.g. "+0%", "-10%", "+25%". */
export const RateString = z.string().regex(/^[+-]\d{1,3}%$/, 'Format kecepatan: +0%, -10%, +20%');

export const VoiceSettings = z.object({
  provider: TtsProviderId.default('edge'),
  id: z.string().min(1).default('en-US-AndrewNeural'),
  rate: RateString.default('+0%'),
});
export type VoiceSettings = z.infer<typeof VoiceSettings>;

/** Where a narration clip came from — drives the licensing badge in the UI. */
export const ClipOrigin = z.enum(['edge', 'upload']);
export type ClipOrigin = z.infer<typeof ClipOrigin>;

export const LicenseInfo = z.object({
  /** True only when the clip may be used in monetised video. */
  commercial: z.boolean().default(false),
  /** Free text: where the clip/sfx came from (URL, tool, recording...). */
  source: z.string().default(''),
  /** Free text: license name or terms. */
  license: z.string().default(''),
});
export type LicenseInfo = z.infer<typeof LicenseInfo>;

/** Reference from an act to a narration clip stored by the server. */
export const ClipRef = z.object({
  id: z.string().min(1),
  /** Seconds, as measured by the server (ffprobe). */
  duration: z.number().nonnegative(),
  origin: ClipOrigin,
  /** Text the clip was generated from (TTS only) — used to detect stale clips. */
  text: z.string().optional(),
  /** Voice the clip was generated with (TTS only). */
  voice: z.string().optional(),
  rate: z.string().optional(),
  license: LicenseInfo.default({ commercial: false, source: '', license: '' }),
});
export type ClipRef = z.infer<typeof ClipRef>;

export const Cue = z.object({
  id: z.string().default(newId),
  /** Seconds from the start of the act (not the whole video). */
  t: z.number().nonnegative(),
  /** SFX id: built-in name (e.g. "door") or uploaded id ("u-…"). */
  sfx: z.string().min(1),
  /** Per-cue volume, 0..2 (multiplied by project `sfxVolume`). */
  vol: z.number().min(0).max(2).default(1),
});
export type Cue = z.infer<typeof Cue>;

export const Act = z.object({
  id: z.string().default(newId),
  /** Minimum act length in seconds. */
  base: z.number().nonnegative(),
  text: z.string().default(''),
  cues: z.array(Cue).default([]),
  clip: ClipRef.optional(),
});
export type Act = z.infer<typeof Act>;

export const Project = z.object({
  name: z.string().min(1),
  /** Absolute path of the Motion Canvas project (local mode export). */
  targetDir: z.string().default(''),
  voice: VoiceSettings.default({ provider: 'edge', id: 'en-US-AndrewNeural', rate: '+0%' }),
  leadIn: z.number().nonnegative().default(0.4),
  pad: z.number().nonnegative().default(0.6),
  sfxVolume: z.number().min(0).max(2).default(0.55),
  acts: z.array(Act).default([]),
});
export type Project = z.infer<typeof Project>;
/** Shape accepted on input (ids/clips optional, defaults applied). */
export type ProjectInput = z.input<typeof Project>;

export function createProject(name: string): Project {
  return Project.parse({ name, acts: [{ base: 5, text: '' }] });
}

export function createAct(base = 5): Act {
  return Act.parse({ base, text: '' });
}

/** Lower-case, dash separated name usable as a file/folder name. */
export function slugify(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'untitled'
  );
}
