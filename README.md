# NarraSync — Studio Audio Motion

Web app lokal untuk mengubah **naskah per act** menjadi `audio/voiceover.mp3` (narasi TTS + efek suara)
dan `src/voice-timing.ts` yang langsung dipakai project **Motion Canvas**, menggantikan `tools/make_voice.py`.

```
naskah per act → TTS (Edge-TTS / upload manual) + efek suara di timeline → voiceover.mp3 + voice-timing.ts
```

## Menjalankan (macOS Catalina 10.15 atau lebih baru)

Prasyarat: **Node 22 LTS** (`nvm install 22`), **ffmpeg + ffprobe** di PATH (static build macOS Intel),
Firefox terbaru atau Chrome 128.

```bash
nvm use            # baca .nvmrc → 22
npm install
cp .env.example .env   # opsional
npm run dev        # web :5173 + server :8787
```

Buka http://localhost:5173 di Firefox.

### Catatan Catalina: esbuild dikunci ke 0.23.x

Vite dan `tsx` memakai binary native **esbuild**. Mulai esbuild 0.24, binary macOS dibuat dengan Go 1.23+
yang butuh macOS 11 (0.27+ butuh macOS 12), sehingga di Catalina gagal dengan
`dyld: Symbol not found: _SecTrustCopyCertificateChain`. Karena itu:

- `tsx` dikunci ke **4.19.2** (versi terakhir yang memakai esbuild `~0.23.0`);
- `package.json` root memaksa `"overrides": { "esbuild": "0.23.1" }` (minimum macOS 10.13) untuk Vite 7.

Jangan menaikkan `tsx` atau menghapus override ini selama masih di Catalina. Kalau `npm install` pernah gagal,
hapus `node_modules` lalu install ulang. Cek dengan `npx esbuild --version` (harus `0.23.1`).

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Vite (5173) + server Fastify (8787, `tsx watch`) |
| `npm run build && npm start` | Build web, lalu server menyajikan UI + API di :8787 |
| `npm test` | Unit test aturan timing + test end-to-end server (butuh ffmpeg) |
| `npm run typecheck` | `tsc` untuk ketiga workspace |

## Alur kerja

1. Beri nama project dan isi **folder project Motion Canvas** (path absolut).
2. Tulis naskah per act + durasi dasar. Klik **Generate suara** (Edge-TTS) atau **Upload clip**.
3. Drag efek suara dari library ke track **Efek suara**; geser cue, atur volume di inspector.
4. **▶ Putar** untuk preview campuran di browser (mute per track, `Spasi` putar/jeda, `Del` hapus cue).
5. **Ekspor ke Motion Canvas** → menulis `audio/voiceover.mp3` dan `src/voice-timing.ts`. Refresh editor Motion Canvas.

**Aturan sinkron** (sama dengan script lama): `panjang act = max(base, leadIn + durasi clip + pad)`,
narasi mulai di `awal act + leadIn`, cue di `awal act + t`. Waktu cue relatif terhadap act, jadi tetap pas
walau act diperpanjang.

## Arsitektur

```
narrasync/
├─ shared/            @narrasync/shared — kontrak bersama web & server
│  └─ src/
│     ├─ schema.ts        Zod: Project, Act, Cue, ClipRef, LicenseInfo (format audio-project.json)
│     ├─ timing.ts        computeTimeline() — satu-satunya implementasi aturan sinkron
│     ├─ voice-timing.ts  generator src/voice-timing.ts
│     ├─ sfx-catalog.ts   16 id efek bawaan
│     └─ api.ts           tipe request/response
├─ server/            Node 22 + Fastify (dijalankan dengan tsx)
│  └─ src/
│     ├─ index.ts / app.ts / config.ts / services.ts   bootstrap + composition root
│     ├─ routes/          HTTP tipis: validasi Zod → panggil service
│     ├─ tts/             interface TtsProvider + adapter Edge (Azure/ElevenLabs menyusul di registry.ts)
│     ├─ clips/           ClipStore: cache clip ter-hash (provider, voice, rate, text) + upload
│     ├─ sfx/             dsp.ts + recipes.ts (16 efek sintetis) + library (bawaan & upload)
│     ├─ audio/           ffmpeg runner, encoder WAV, builder argumen mix (adelay + amix + alimiter)
│     ├─ render/          Renderer (project → mp3) + penulis output Motion Canvas
│     └─ projects/        ProjectStore: projects/<slug>/audio-project.json
└─ web/               React 19 + Vite 7 + Zustand
   └─ src/
      ├─ api/client.ts    satu-satunya tempat fetch
      ├─ store/           project (state murni + autosave draft), library, player, toast, commands (alur async)
      ├─ audio/           AudioContext/buffer cache + PreviewEngine (Web Audio, aturan gain sama dengan ffmpeg)
      └─ features/        project · acts · sfx · timeline
```

Prinsip:

- **Satu sumber kebenaran untuk timing** — `computeTimeline()` di `shared/` dipakai UI, preview, dan render server.
- **Browser tidak menyimpan API key atau menulis file.** Semua kerja berat ada di server, jadi hosting nanti cukup memindah server.
- **Penyedia TTS bisa diganti** lewat interface `TtsProvider` tanpa menyentuh UI.
- **Cache berbasis konten**: clip TTS (`cache/clips/tts-<hash>`), upload (`up-<hash>`), dan hasil render (`cache/renders/<hash>.mp3`)
  tidak dibuat ulang bila input tidak berubah.

### API

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/health` | mode, versi ffmpeg, daftar penyedia |
| GET | `/api/tts/voices` | daftar suara Edge (fallback offline) |
| POST | `/api/tts` | generate / ambil dari cache clip narasi |
| POST | `/api/clips` | upload clip suara manual (multipart + metadata lisensi) |
| GET | `/api/clips/:id/audio` | file clip |
| GET/POST | `/api/sfx`, `/api/sfx/:id/audio` | library efek suara, upload WAV/MP3 |
| GET/PUT | `/api/projects`, `/api/projects/:slug` | simpan/buka `audio-project.json` |
| POST | `/api/render` | render & unduh MP3 (lokal & hosted) |
| POST | `/api/export` | tulis ke folder Motion Canvas (hanya `STUDIO_MODE=local`) |

## Lisensi suara

Clip Edge-TTS ditandai **"Belum berlisensi komersial"** di UI dan di peringatan ekspor. Clip/efek yang di-upload
menyimpan sumber, lisensi, dan flag komersial di metadata. Efek bawaan dibuat dari rumus (tanpa sampel pihak ketiga).
Sebelum monetisasi, buat ulang narasi dengan penyedia berlisensi (Azure AI Speech / ElevenLabs — P1). Ini bukan nasihat hukum.

## Status roadmap

- [x] M1 Engine: TTS, 16 efek sintetis, mix ffmpeg, `voice-timing.ts`
- [x] M2 Editor: act + naskah, generate/upload per act, preview clip (wavesurfer.js)
- [x] M3 Timeline: track narasi & efek suara, drag cue, volume, preview Web Audio, mute per track
- [x] M4 Ekspor & simpan: tulis ke folder Motion Canvas, simpan/buka/impor/unduh `audio-project.json`, autosave draft
- [ ] M1 verifikasi: bandingkan output dengan `make_voice.py` untuk Smart Motion Light (rumus efek perlu disamakan)
- [ ] M5 Hosting: ekspor zip, deploy server & web terpisah (`VITE_API_BASE`)
- [ ] P1: adapter Azure / ElevenLabs, multi-bahasa
