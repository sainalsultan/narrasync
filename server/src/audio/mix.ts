/**
 * ffmpeg mix: every input is delayed to its absolute start, summed without
 * normalisation (amix normalize=0), limited, then padded/trimmed to the
 * exact total length so the MP3 matches TOTAL_LENGTH.
 */

export interface MixInput {
  file: string;
  /** Absolute start time in seconds. */
  at: number;
  gain: number;
}

export const OUTPUT_SAMPLE_RATE = 44100;
const ENCODE_ARGS = ['-c:a', 'libmp3lame', '-b:a', '192k', '-ar', String(OUTPUT_SAMPLE_RATE), '-ac', '2'];

const fmt = (n: number) => Number(n.toFixed(4)).toString();

export function buildMixArgs(inputs: MixInput[], total: number, outFile: string): string[] {
  if (inputs.length === 0) {
    return ['-f', 'lavfi', '-i', `anullsrc=r=${OUTPUT_SAMPLE_RATE}:cl=stereo`, '-t', fmt(total), ...ENCODE_ARGS, outFile];
  }

  const args: string[] = [];
  const chains: string[] = [];
  inputs.forEach((input, i) => {
    args.push('-i', input.file);
    const ms = Math.max(0, Math.round(input.at * 1000));
    chains.push(
      `[${i}:a]aresample=${OUTPUT_SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,` +
        `volume=${fmt(input.gain)},adelay=${ms}|${ms}[a${i}]`,
    );
  });
  const labels = inputs.map((_, i) => `[a${i}]`).join('');
  chains.push(
    `${labels}amix=inputs=${inputs.length}:normalize=0:dropout_transition=0,` +
      `alimiter=limit=0.95:level=disabled,apad=whole_dur=${fmt(total)},atrim=0:${fmt(total)}[out]`,
  );
  return [...args, '-filter_complex', chains.join(';'), '-map', '[out]', ...ENCODE_ARGS, outFile];
}
