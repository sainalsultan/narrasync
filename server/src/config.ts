import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AppConfig {
  host: string;
  port: number;
  /** `local`: may write into the Motion Canvas folder. `hosted`: download only. */
  mode: 'local' | 'hosted';
  cacheDir: string;
  projectsDir: string;
  ffmpegPath: string;
  ffprobePath: string;
  /** Allowed browser origins (dev server). */
  corsOrigins: string[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadDotEnv(): void {
  const file = path.join(repoRoot, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) loadDotEnv();
  const resolve = (p: string | undefined, fallback: string) => path.resolve(repoRoot, p ?? fallback);
  return {
    host: env.HOST ?? '127.0.0.1',
    port: Number(env.PORT ?? 8787),
    mode: env.STUDIO_MODE === 'hosted' ? 'hosted' : 'local',
    cacheDir: resolve(env.CACHE_DIR, 'cache'),
    projectsDir: resolve(env.PROJECTS_DIR, 'projects'),
    ffmpegPath: env.FFMPEG_PATH ?? 'ffmpeg',
    ffprobePath: env.FFPROBE_PATH ?? 'ffprobe',
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
  };
}
