import { createReadStream } from 'node:fs';
import path from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { badRequest } from './errors.ts';

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
};

export function sendAudio(reply: FastifyReply, file: string, opts: { downloadName?: string; immutable?: boolean } = {}) {
  const ext = path.extname(file).slice(1).toLowerCase();
  reply.header('Content-Type', MIME[ext] ?? 'application/octet-stream');
  if (opts.immutable) reply.header('Cache-Control', 'public, max-age=31536000, immutable');
  if (opts.downloadName) reply.header('Content-Disposition', `attachment; filename="${opts.downloadName}"`);
  return reply.send(createReadStream(file));
}

export interface Upload {
  filename: string;
  data: Buffer;
  fields: Record<string, string>;
}

/** Read a single-file multipart request. Text fields must precede the file. */
export async function readUpload(req: FastifyRequest): Promise<Upload> {
  const part = await req.file();
  if (!part) throw badRequest('Tidak ada file yang di-upload');
  const data = await part.toBuffer();
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(part.fields)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v && v.type === 'field') fields[key] = String(v.value);
  }
  return { filename: part.filename, data, fields };
}
