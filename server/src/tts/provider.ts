import type { TtsProviderId, VoiceInfo } from '@narrasync/shared';

export interface SynthesisInput {
  voice: string;
  /** "+0%", "-10%"… (providers translate as needed). */
  rate: string;
  text: string;
}

export interface SynthesisResult {
  audio: Buffer;
  ext: 'mp3' | 'wav';
}

/**
 * Every TTS backend implements this interface, so commercial providers
 * (Azure AI Speech, ElevenLabs — P1) plug in without touching the UI.
 */
export interface TtsProvider {
  readonly id: TtsProviderId;
  readonly name: string;
  /** Whether output from this provider is licensed for commercial use. */
  readonly commercial: boolean;
  listVoices(): Promise<VoiceInfo[]>;
  synthesize(input: SynthesisInput): Promise<SynthesisResult>;
}
