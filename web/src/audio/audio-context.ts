let ctx: AudioContext | null = null;

/** One shared AudioContext (created lazily after a user gesture). */
export function getAudioContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const buffers = new Map<string, Promise<AudioBuffer>>();

/** Fetch + decode once per URL (clip/sfx URLs are content-addressed). */
export function loadBuffer(url: string): Promise<AudioBuffer> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Audio tidak bisa dimuat (${res.status}): ${url}`);
        return res.arrayBuffer();
      })
      .then((data) => getAudioContext().decodeAudioData(data));
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return p;
}

/** Fire-and-forget one-shot playback (SFX library preview). */
export async function playOnce(url: string, gain = 1): Promise<void> {
  const ac = getAudioContext();
  const src = ac.createBufferSource();
  src.buffer = await loadBuffer(url);
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start();
}
