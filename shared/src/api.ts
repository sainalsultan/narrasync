import { z } from 'zod';
import { ClipRef, LicenseInfo, RateString, TtsProviderId } from './schema.ts';

/** Request/response contracts shared by web and server. */

export const TtsRequest = z.object({
  provider: TtsProviderId.default('edge'),
  voice: z.string().min(1),
  rate: RateString.default('+0%'),
  text: z.string().trim().min(1, 'Naskah kosong'),
});
export type TtsRequest = z.infer<typeof TtsRequest>;

/** Upload metadata sent as multipart fields alongside the file. */
export const UploadLicenseFields = LicenseInfo.extend({
  commercial: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .default(false),
});

export const VoiceInfo = z.object({
  id: z.string(),
  name: z.string(),
  locale: z.string(),
  gender: z.string(),
});
export type VoiceInfo = z.infer<typeof VoiceInfo>;

export interface HealthResponse {
  ok: true;
  mode: 'local' | 'hosted';
  ffmpeg: string | null;
  providers: { id: string; name: string; commercial: boolean }[];
}

export type ClipResponse = ClipRef;

export interface ProjectSummary {
  slug: string;
  name: string;
  updatedAt: string;
}

export interface ExportResult {
  files: string[];
  actLengths: number[];
  total: number;
  warnings: string[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}
