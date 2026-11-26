import { createFfmpeg, type FfmpegRunner } from './audio/ffmpeg.ts';
import { ClipStore } from './clips/clip-store.ts';
import type { AppConfig } from './config.ts';
import { ProjectStore } from './projects/project-store.ts';
import { Renderer } from './render/renderer.ts';
import { SfxLibrary } from './sfx/library.ts';
import { type TtsRegistry, createTtsRegistry } from './tts/registry.ts';

/** Composition root: every service is created here and injected into routes. */
export interface Services {
  config: AppConfig;
  ffmpeg: FfmpegRunner;
  tts: TtsRegistry;
  clips: ClipStore;
  sfx: SfxLibrary;
  projects: ProjectStore;
  renderer: Renderer;
}

export async function createServices(config: AppConfig, overrides: Partial<Services> = {}): Promise<Services> {
  const ffmpeg = overrides.ffmpeg ?? createFfmpeg(config.ffmpegPath, config.ffprobePath);
  const tts = overrides.tts ?? createTtsRegistry();
  const clips = new ClipStore(config.cacheDir, ffmpeg, tts);
  const sfx = new SfxLibrary(config.cacheDir, ffmpeg);
  const projects = new ProjectStore(config.projectsDir);
  await Promise.all([clips.init(), sfx.init(), projects.init()]);
  const renderer = new Renderer(config.cacheDir, ffmpeg, clips, sfx);
  return { config, ffmpeg, tts, clips, sfx, projects, renderer, ...overrides };
}
