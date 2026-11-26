import { useEffect, useRef } from 'react';
import { loadBuffer } from '../../audio/audio-context.ts';

/** Lightweight peak waveform drawn on a canvas from the decoded clip. */
export function Waveform({ url, width, height, color }: { url: string; width: number; height: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadBuffer(url)
      .then((buffer) => {
        const canvas = ref.current;
        if (cancelled || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.floor(width));
        canvas.width = w * dpr;
        canvas.height = height * dpr;
        const g = canvas.getContext('2d')!;
        g.scale(dpr, dpr);
        g.fillStyle = color;
        const data = buffer.getChannelData(0);
        const step = data.length / w;
        const mid = height / 2;
        for (let x = 0; x < w; x++) {
          let peak = 0;
          const from = Math.floor(x * step);
          const to = Math.min(data.length, Math.floor((x + 1) * step));
          for (let i = from; i < to; i += 4) peak = Math.max(peak, Math.abs(data[i]!));
          const h = Math.max(1, peak * (height - 4));
          g.fillRect(x, mid - h / 2, 1, h);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url, width, height, color]);

  return <canvas ref={ref} style={{ width, height }} className="waveform" />;
}
