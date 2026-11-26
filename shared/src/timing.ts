import type { Project } from './schema.ts';

/**
 * Sync rules (identical to the original make_voice.py pipeline):
 *
 *   act length      = max(base, leadIn + clipDuration + pad)
 *   narration start = actStart + leadIn
 *   cue start       = actStart + cue.t
 *
 * Cue times are relative to the act, so cues stay in place when an act grows.
 */

/** Rounding used for every exported number (centiseconds). */
export const roundTime = (s: number) => Math.round(s * 100) / 100;

export function actLength(base: number, clipDuration: number | undefined, leadIn: number, pad: number): number {
  if (clipDuration === undefined || clipDuration <= 0) return roundTime(base);
  return roundTime(Math.max(base, leadIn + clipDuration + pad));
}

export interface TimelineAct {
  index: number;
  actId: string;
  start: number;
  length: number;
  end: number;
  /** Absolute start of narration, or null when the act has no clip. */
  narrationStart: number | null;
  narrationDuration: number;
}

export interface TimelineCue {
  actId: string;
  cueId: string;
  sfx: string;
  /** Absolute time in seconds. */
  start: number;
  /** Final gain = cue.vol * project.sfxVolume. */
  gain: number;
}

export interface Timeline {
  acts: TimelineAct[];
  cues: TimelineCue[];
  actLengths: number[];
  total: number;
}

/**
 * Build the absolute timeline of a project.
 * @param durations optional override of clip durations by act id
 *                  (the server passes values measured with ffprobe).
 */
export function computeTimeline(project: Project, durations?: ReadonlyMap<string, number>): Timeline {
  const acts: TimelineAct[] = [];
  const cues: TimelineCue[] = [];
  let cursor = 0;

  project.acts.forEach((act, index) => {
    const clipDuration = durations?.get(act.id) ?? act.clip?.duration;
    const length = actLength(act.base, clipDuration, project.leadIn, project.pad);
    const start = roundTime(cursor);
    const hasClip = clipDuration !== undefined && clipDuration > 0;

    acts.push({
      index,
      actId: act.id,
      start,
      length,
      end: roundTime(start + length),
      narrationStart: hasClip ? roundTime(start + project.leadIn) : null,
      narrationDuration: hasClip ? clipDuration : 0,
    });

    for (const cue of act.cues) {
      cues.push({
        actId: act.id,
        cueId: cue.id,
        sfx: cue.sfx,
        start: roundTime(start + cue.t),
        gain: cue.vol * project.sfxVolume,
      });
    }
    cursor += length;
  });

  const actLengths = acts.map((a) => a.length);
  return { acts, cues, actLengths, total: roundTime(cursor) };
}
