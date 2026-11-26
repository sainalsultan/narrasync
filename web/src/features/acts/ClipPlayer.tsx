import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { api } from '../../api/client.ts';

/** Waveform + play button for a single narration clip (wavesurfer.js). */
export function ClipPlayer({ clipId }: { clipId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const ws = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const instance = WaveSurfer.create({
      container: container.current,
      url: api.clipUrl(clipId),
      height: 36,
      waveColor: '#5b5f7a',
      progressColor: '#9d86ff',
      cursorColor: '#e8e6ff',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    });
    instance.on('play', () => setPlaying(true));
    instance.on('pause', () => setPlaying(false));
    instance.on('finish', () => setPlaying(false));
    ws.current = instance;
    return () => instance.destroy();
  }, [clipId]);

  return (
    <div className="clip-player">
      <button className="icon-btn" onClick={() => ws.current?.playPause()} aria-label={playing ? 'Jeda' : 'Putar clip'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="clip-player__wave" ref={container} />
    </div>
  );
}
