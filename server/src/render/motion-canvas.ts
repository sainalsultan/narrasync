import { existsSync } from 'node:fs';
import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { badRequest } from '../lib/errors.ts';
import { ensureDir, writeFileAtomic } from '../lib/fs.ts';

export const VOICEOVER_PATH = path.join('audio', 'voiceover.mp3');
export const VOICE_TIMING_PATH = path.join('src', 'voice-timing.ts');

/**
 * Writes the only two files the Motion Canvas project consumes:
 *   audio/voiceover.mp3 and src/voice-timing.ts
 */
export async function writeMotionCanvasOutputs(
  targetDir: string,
  mp3File: string,
  timingTs: string,
): Promise<{ files: string[]; warnings: string[] }> {
  if (!targetDir || !path.isAbsolute(targetDir)) {
    throw badRequest('Folder project Motion Canvas harus berupa path absolut, mis. /Users/kamu/Projects/video');
  }
  const info = await stat(targetDir).catch(() => null);
  if (!info?.isDirectory()) throw badRequest(`Folder tidak ditemukan: ${targetDir}`);

  const warnings: string[] = [];
  if (!existsSync(path.join(targetDir, 'package.json'))) {
    warnings.push('package.json tidak ada di folder tujuan — pastikan ini folder project Motion Canvas.');
  }

  const voiceover = path.join(targetDir, VOICEOVER_PATH);
  const timing = path.join(targetDir, VOICE_TIMING_PATH);
  await ensureDir(path.dirname(voiceover));
  await copyFile(mp3File, voiceover);
  await writeFileAtomic(timing, timingTs);
  return { files: [voiceover, timing], warnings };
}
