import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { VoiceInfo } from '@narrasync/shared';
import type { SynthesisInput, SynthesisResult, TtsProvider } from './provider.ts';

/** Shown when the voice list cannot be fetched (offline). */
const FALLBACK_VOICES: VoiceInfo[] = [
  { id: 'en-US-AndrewNeural', name: 'Andrew', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-AvaNeural', name: 'Ava', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-BrianNeural', name: 'Brian', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-EmmaNeural', name: 'Emma', locale: 'en-US', gender: 'Female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', locale: 'en-GB', gender: 'Male' },
  { id: 'id-ID-ArdiNeural', name: 'Ardi', locale: 'id-ID', gender: 'Male' },
  { id: 'id-ID-GadisNeural', name: 'Gadis', locale: 'id-ID', gender: 'Female' },
];

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Edge "Read Aloud" voices via msedge-tts.
 * Unofficial endpoint — NOT licensed for commercial use.
 */
export class EdgeTtsProvider implements TtsProvider {
  readonly id = 'edge' as const;
  readonly name = 'Edge-TTS';
  readonly commercial = false;
  private voices: VoiceInfo[] | null = null;

  async listVoices(): Promise<VoiceInfo[]> {
    if (this.voices) return this.voices;
    try {
      const raw = await new MsEdgeTTS().getVoices();
      this.voices = raw
        .map((v) => ({
          id: v.ShortName,
          name: v.FriendlyName.replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, ''),
          locale: v.Locale,
          gender: v.Gender,
        }))
        .sort((a, b) => a.locale.localeCompare(b.locale) || a.name.localeCompare(b.name));
      return this.voices;
    } catch {
      return FALLBACK_VOICES;
    }
  }

  async synthesize({ voice, rate, text }: SynthesisInput): Promise<SynthesisResult> {
    const tts = new MsEdgeTTS({ connectionTimeoutMs: 15000, synthesisTimeoutMs: 60000 });
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(escapeXml(text), { rate });
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) chunks.push(chunk as Buffer);
      const audio = Buffer.concat(chunks);
      if (audio.length === 0) throw new Error('Edge-TTS tidak mengembalikan audio (cek nama suara / koneksi).');
      return { audio, ext: 'mp3' };
    } finally {
      tts.close();
    }
  }
}
