import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Write via temp file + rename so readers never see half-written files. */
export async function writeFileAtomic(file: string, data: string | Uint8Array): Promise<void> {
  await ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export const writeJson = (file: string, value: unknown) => writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);

/** Ids that reach the filesystem must be plain tokens (no path traversal). */
export const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,80}$/i;
