import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);

/**
 * Binaries bundled through npm (ffmpeg-static 6.1 / ffprobe-static), so no manual
 * install is needed. Their macOS x64 builds target macOS 10.13+, i.e. they run on Catalina.
 */
function bundledBinary(pkg: 'ffmpeg-static' | 'ffprobe-static'): string | null {
  try {
    const mod = require(pkg) as string | { path: string } | null;
    const file = typeof mod === 'string' ? mod : mod?.path;
    return file && existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

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
    // Priority: .env override → bundled npm binary → whatever is on PATH.
    ffmpegPath: env.FFMPEG_PATH ?? bundledBinary('ffmpeg-static') ?? 'ffmpeg',
    ffprobePath: env.FFPROBE_PATH ?? bundledBinary('ffprobe-static') ?? 'ffprobe',
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
  };
}
