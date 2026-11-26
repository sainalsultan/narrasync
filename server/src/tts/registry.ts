import type { TtsProviderId } from '@narrasync/shared';
import { badRequest } from '../lib/errors.ts';
import { EdgeTtsProvider } from './edge.ts';
import type { TtsProvider } from './provider.ts';

export class TtsRegistry {
  private readonly providers = new Map<TtsProviderId, TtsProvider>();

  constructor(providers: TtsProvider[]) {
    for (const p of providers) this.providers.set(p.id, p);
  }

  get(id: TtsProviderId): TtsProvider {
    const p = this.providers.get(id);
    if (!p) throw badRequest(`Penyedia TTS "${id}" belum tersedia`);
    return p;
  }

  list(): TtsProvider[] {
    return [...this.providers.values()];
  }
}

/** P1: register Azure / ElevenLabs adapters here when API keys are present. */
export function createTtsRegistry(): TtsRegistry {
  return new TtsRegistry([new EdgeTtsProvider()]);
}
