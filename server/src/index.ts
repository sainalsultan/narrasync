import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createServices } from './services.ts';

const config = loadConfig();
const services = await createServices(config);
const app = await buildApp(services, { logger: true });

const ffmpeg = await services.ffmpeg.version();
if (!ffmpeg) app.log.warn('ffmpeg tidak ditemukan di PATH — render/ekspor tidak akan jalan. Set FFMPEG_PATH/FFPROBE_PATH.');

await app.listen({ host: config.host, port: config.port });
app.log.info(`NarraSync server (${config.mode}) siap di http://${config.host}:${config.port}`);
