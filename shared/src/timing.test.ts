import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Project } from './schema.ts';
import { actLength, computeTimeline } from './timing.ts';
import { renderVoiceTimingTs } from './voice-timing.ts';

test('actLength = max(base, leadIn + clip + pad)', () => {
  assert.equal(actLength(7, 5, 0.4, 0.6), 7);
  assert.equal(actLength(7, 6.5, 0.4, 0.6), 7.5);
  assert.equal(actLength(4, undefined, 0.4, 0.6), 4);
});

test('cues are relative to act start and survive act growth', () => {
  const project = Project.parse({
    name: 'demo',
    acts: [
      { id: 'a', base: 3, text: 'x', clip: { id: 'c1', duration: 4, origin: 'edge' } },
      { id: 'b', base: 5, text: 'y', cues: [{ id: 'q', t: 1.5, sfx: 'door', vol: 0.8 }] },
    ],
  });
  const tl = computeTimeline(project);
  assert.deepEqual(tl.actLengths, [5, 5]);
  assert.equal(tl.total, 10);
  assert.equal(tl.acts[0]?.narrationStart, 0.4);
  assert.equal(tl.cues[0]?.start, 6.5);
  assert.ok(Math.abs((tl.cues[0]?.gain ?? 0) - 0.8 * 0.55) < 1e-9);
});

test('PRD example parses with defaults and ids', () => {
  const p = Project.parse({
    name: 'smart-motion-light',
    acts: [{ base: 7, text: 'Imagine...', cues: [{ t: 0.6, sfx: 'door', vol: 0.8 }] }],
  });
  assert.equal(p.voice.id, 'en-US-AndrewNeural');
  assert.ok(p.acts[0]?.id);
  assert.ok(p.acts[0]?.cues[0]?.id);
});

test('voice-timing.ts output', () => {
  const ts = renderVoiceTimingTs({ actLengths: [7, 8.25], total: 15.25 });
  assert.match(ts, /export const ACT_LENGTHS = \[7, 8.25\];/);
  assert.match(ts, /export const TOTAL_LENGTH = 15.25;/);
});
