import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Project, type ProjectSummary, slugify } from '@narrasync/shared';
import { badRequest, notFound } from '../lib/errors.ts';
import { SAFE_ID, ensureDir, readJson, writeJson } from '../lib/fs.ts';

/** Saved projects: `projects/<slug>/audio-project.json`. */
export class ProjectStore {
  constructor(private readonly dir: string) {}

  async init(): Promise<void> {
    await ensureDir(this.dir);
  }

  private file(slug: string): string {
    if (!SAFE_ID.test(slug)) throw badRequest(`Nama project tidak valid: ${slug}`);
    return path.join(this.dir, slug, 'audio-project.json');
  }

  async list(): Promise<ProjectSummary[]> {
    const out: ProjectSummary[] = [];
    for (const slug of await readdir(this.dir).catch(() => [])) {
      if (!SAFE_ID.test(slug)) continue;
      const file = path.join(this.dir, slug, 'audio-project.json');
      const data = await readJson<{ name?: string }>(file).catch(() => null);
      if (!data) continue;
      const { mtime } = await stat(file);
      out.push({ slug, name: data.name ?? slug, updatedAt: mtime.toISOString() });
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(slug: string): Promise<Project> {
    const data = await readJson<unknown>(this.file(slug));
    if (!data) throw notFound(`Project "${slug}" tidak ditemukan`);
    return Project.parse(data);
  }

  async save(project: Project): Promise<ProjectSummary> {
    const slug = slugify(project.name);
    await writeJson(this.file(slug), project);
    return { slug, name: project.name, updatedAt: new Date().toISOString() };
  }
}
