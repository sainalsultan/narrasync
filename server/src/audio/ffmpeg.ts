import { spawn } from 'node:child_process';

export interface FfmpegRunner {
  run(args: string[]): Promise<void>;
  probeDuration(file: string): Promise<number>;
  version(): Promise<string | null>;
}

function exec(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => reject(new Error(`Gagal menjalankan ${bin}: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} keluar dengan kode ${code}:\n${stderr.split('\n').slice(-15).join('\n')}`));
    });
  });
}

export function createFfmpeg(ffmpegPath: string, ffprobePath: string): FfmpegRunner {
  return {
    async run(args) {
      await exec(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    },
    async probeDuration(file) {
      const { stdout } = await exec(ffprobePath, [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file,
      ]);
      const d = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(d)) throw new Error(`Durasi tidak terbaca untuk ${file}`);
      return d;
    },
    /** First line of `ffmpeg -version`, or null when ffmpeg or ffprobe cannot run. */
    async version() {
      try {
        const [{ stdout }] = await Promise.all([exec(ffmpegPath, ['-version']), exec(ffprobePath, ['-version'])]);
        return stdout.split('\n')[0] ?? null;
      } catch {
        return null;
      }
    },
  };
}
