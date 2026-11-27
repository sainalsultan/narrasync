import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createServices } from './services.ts';

const config = loadConfig();
const services = await createServices(config);
const app = await buildApp(services, { logger: true });

const ffmpeg = await services.ffmpeg.version();
if (ffmpeg) app.log.info(`ffmpeg: ${config.ffmpegPath} (${ffmpeg})`);
else app.log.warn(`ffmpeg/ffprobe tidak bisa dijalankan (${config.ffmpegPath}, ${config.ffprobePath}). Jalankan ulang npm install atau set FFMPEG_PATH/FFPROBE_PATH di .env.`);

await app.listen({ host: config.host, port: config.port });
app.log.info(`NarraSync server (${config.mode}) siap di http://${config.host}:${config.port}`);
