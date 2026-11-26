import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BUILTIN_SFX, type SfxMeta } from '@narrasync/shared';
import { buildApp } from './app.ts';
import { createFfmpeg } from './audio/ffmpeg.ts';
import { loadConfig } from './config.ts';
import { createServices } from './services.ts';
import type { TtsProvider } from './tts/provider.ts';
import { TtsRegistry } from './tts/registry.ts';

/** Offline stand-in for Edge-TTS: 0.25 s of sine per word. */
function fakeTts(): TtsProvider {
  const ff = createFfmpeg('ffmpeg', 'ffprobe');
  let calls = 0;
  return {
    id: 'edge',
    name: 'Fake',
    commercial: false,
    get calls() {
      return calls;
    },
    async listVoices() {
      return [{ id: 'x', name: 'X', locale: 'en-US', gender: 'Male' }];
    },
    async synthesize({ text }) {
      calls++;
      const dir = await mkdtemp(path.join(tmpdir(), 'tts-'));
      const out = path.join(dir, 'a.mp3');
      const secs = text.split(/\s+/).length * 0.25;
      await ff.run(['-f', 'lavfi', '-i', `sine=f=440:d=${secs}`, '-c:a', 'libmp3lame', out]);
      const audio = await readFile(out);
      await rm(dir, { recursive: true });
      return { audio, ext: 'mp3' };
    },
  } as TtsProvider;
}

test('end-to-end: sfx library, tts cache, render, export', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'narrasync-'));
  const config = { ...loadConfig({}), cacheDir: path.join(root, 'cache'), projectsDir: path.join(root, 'projects') };
  const provider = fakeTts();
  const services = await createServices(config, { tts: new TtsRegistry([provider]) });
  const app = await buildApp(services);

  try {
    const sfx = (await app.inject({ url: '/api/sfx' })).json<SfxMeta[]>();
    assert.equal(sfx.length, BUILTIN_SFX.length);
    for (const s of sfx) assert.ok(s.duration > 0.02 && s.duration < 1.5, `${s.id} duration`);

    const ttsBody = { voice: 'en-US-AndrewNeural', rate: '+0%', text: 'one two three four five six seven eight' };
    const clip = (await app.inject({ method: 'POST', url: '/api/tts', payload: ttsBody })).json();
    assert.equal(clip.cached, false);
    assert.ok(Math.abs(clip.duration - 2) < 0.1);
    const again = (await app.inject({ method: 'POST', url: '/api/tts', payload: ttsBody })).json();
    assert.equal(again.cached, true);
    assert.equal((provider as unknown as { calls: number }).calls, 1);

    const target = path.join(root, 'mc');
    await mkdir(target);
    const project = {
      name: 'Demo Video',
      targetDir: target,
      acts: [
        { base: 1, text: ttsBody.text, clip, cues: [{ t: 0.2, sfx: 'door', vol: 0.8 }] },
        { base: 3, text: '', cues: [{ t: 1, sfx: 'ping' }] },
      ],
    };
    const res = await app.inject({ method: 'POST', url: '/api/export', payload: project });
    assert.equal(res.statusCode, 200, res.body);
    const result = res.json();
    // act 1 = leadIn 0.4 + clip (~2 s + MP3 encoder padding) + pad 0.6
    assert.equal(result.actLengths[0], Math.round((0.4 + clip.duration + 0.6) * 100) / 100);
    assert.equal(result.actLengths[1], 3);

    const ts = await readFile(path.join(target, 'src/voice-timing.ts'), 'utf8');
    assert.match(ts, new RegExp(`ACT_LENGTHS = \\[${result.actLengths.join(', ')}\\]`));
    assert.match(ts, new RegExp(`TOTAL_LENGTH = ${result.total};`));
    const dur = await services.ffmpeg.probeDuration(path.join(target, 'audio/voiceover.mp3'));
    assert.ok(Math.abs(dur - result.total) < 0.06, `mp3 duration ${dur} vs ${result.total}`);

    const save = await app.inject({ method: 'PUT', url: '/api/projects', payload: project });
    assert.equal(save.json().slug, 'demo-video');
    const loaded = (await app.inject({ url: '/api/projects/demo-video' })).json();
    assert.equal(loaded.acts.length, 2);

    const bad = await app.inject({ method: 'POST', url: '/api/tts', payload: { voice: 'x', text: '  ' } });
    assert.equal(bad.statusCode, 400);
  } finally {
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
});
