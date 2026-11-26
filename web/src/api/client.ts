import type {
  ApiError,
  ClipRef,
  ExportResult,
  HealthResponse,
  LicenseInfo,
  Project,
  ProjectSummary,
  SfxMeta,
  TtsRequest,
  VoiceInfo,
} from '@narrasync/shared';

/** Empty in dev (Vite proxy) and when served by the server; set for a separately hosted API. */
const API_BASE = `${import.meta.env.VITE_API_BASE ?? ''}/api`;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, init);
  } catch {
    throw new ApiRequestError('Server lokal tidak terjangkau. Sudah jalankan `npm run dev`?', 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(body?.error ?? `${res.status} ${res.statusText}`, res.status);
  }
  return res;
}

const getJson = async <T>(path: string) => (await call(path)).json() as Promise<T>;
const sendJson = async <T>(method: string, path: string, body: unknown) =>
  (await call(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json() as Promise<T>;

function uploadForm(file: File, license: LicenseInfo): FormData {
  const form = new FormData();
  // Text fields first: the server reads them from the file part.
  form.append('commercial', String(license.commercial));
  form.append('source', license.source);
  form.append('license', license.license);
  form.append('file', file);
  return form;
}

export const api = {
  health: () => getJson<HealthResponse>('/health'),
  voices: (provider = 'edge') => getJson<VoiceInfo[]>(`/tts/voices?provider=${encodeURIComponent(provider)}`),
  tts: (req: TtsRequest) => sendJson<ClipRef & { cached: boolean }>('POST', '/tts', req),

  uploadClip: async (file: File, license: LicenseInfo) =>
    (await call('/clips', { method: 'POST', body: uploadForm(file, license) })).json() as Promise<ClipRef>,
  clipUrl: (id: string) => `${API_BASE}/clips/${encodeURIComponent(id)}/audio`,

  sfxList: () => getJson<SfxMeta[]>('/sfx'),
  sfxUrl: (id: string) => `${API_BASE}/sfx/${encodeURIComponent(id)}/audio`,
  uploadSfx: async (file: File, license: LicenseInfo) =>
    (await call('/sfx', { method: 'POST', body: uploadForm(file, license) })).json() as Promise<SfxMeta>,

  projects: () => getJson<ProjectSummary[]>('/projects'),
  project: (slug: string) => getJson<unknown>(`/projects/${encodeURIComponent(slug)}`),
  saveProject: (project: Project) => sendJson<ProjectSummary>('PUT', '/projects', project),

  /** Render the mix and return it as a Blob (download). */
  render: async (project: Project) =>
    (await call('/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) })).blob(),
  exportToFolder: (project: Project) => sendJson<ExportResult>('POST', '/export', project),
};
