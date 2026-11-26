import { z } from 'zod';
import { LicenseInfo } from './schema.ts';

/** The 16 formula-based effects (no third-party samples → safe to ship). */
export const BUILTIN_SFX = [
  'pop', 'step', 'door', 'light_on', 'ping', 'blip', 'alert', 'confirm',
  'whoosh', 'process', 'click', 'power', 'tap', 'wifi', 'impact', 'shine',
] as const;
export type BuiltinSfxId = (typeof BUILTIN_SFX)[number];

export function isBuiltinSfx(id: string): id is BuiltinSfxId {
  return (BUILTIN_SFX as readonly string[]).includes(id);
}

export const SfxMeta = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['builtin', 'upload']),
  /** Seconds. */
  duration: z.number().nonnegative(),
  license: LicenseInfo,
});
export type SfxMeta = z.infer<typeof SfxMeta>;
