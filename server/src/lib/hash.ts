import { createHash } from 'node:crypto';

/** Short, stable hash used for cache keys and file names. */
export function shortHash(...parts: (string | Buffer)[]): string {
  const h = createHash('sha256');
  for (const p of parts) {
    h.update(p);
    h.update('\u0000');
  }
  return h.digest('hex').slice(0, 20);
}
