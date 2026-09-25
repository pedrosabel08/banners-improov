/**
 * render-videos.js
 * Gera uma versão MP4 de cada vídeo original por dimensão usando FFmpeg.
 * Os originais são somente lidos; todas as saídas são criadas em rendered-videos/.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  loadConfig,
  requireValidConfig,
  VIDEO_SOURCE_DIR,
  RENDERED_VIDEO_DIR,
} = require("./lib/common");

function ensureFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      "FFmpeg não encontrado ou não executável. Instale FFmpeg e adicione ffmpeg.exe ao PATH.",
    );
}

function focalOffset(value) {
  const normalized = Number.isFinite(value) ? value : 50;
  return (normalized / 100).toFixed(4);
}

function renderVideo(video, size, config, index, total) {
  const sourcePath = path.join(VIDEO_SOURCE_DIR, video.file);
  const outputPath = path.join(
    RENDERED_VIDEO_DIR,
    `${video.id}_${size.id}.mp4`,
  );
  const focal = config.focalPoints?.[video.id]?.[size.id] || { x: 50, y: 50 };
  const videoWidth = size.videoWidth || size.width;
  const videoHeight =
    (size.videoHeight || size.height) +
    (config.videoHeightOffsets?.[video.id] || 0);
  // O scale aumenta sem deformar; crop remove somente o excesso. x/y selecionam
  // a posição dentro da área excedente (0 = esquerda/topo, 100 = direita/base).
  const filter = `scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=increase:flags=lanczos,crop=${videoWidth}:${videoHeight}:x=(iw-ow)*${focalOffset(focal.x)}:y=(ih-oh)*${focalOffset(focal.y)},setsar=1`;
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    sourcePath,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    config.render?.preset || "medium",
    "-crf",
    String(config.render?.crf ?? 21),
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    outputPath,
  ];
  const renderedDimensions = `${videoWidth}x${videoHeight}`;
  console.log(`[${index}/${total}] Processando ${video.id} → ${size.id}${renderedDimensions === size.id ? "" : ` (vídeo ${renderedDimensions})`}`);
  const result = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw new Error(
      `FFmpeg falhou em ${video.id} → ${size.id}: ${(result.stderr || result.error?.message || "erro sem detalhes").trim()}`,
    );
  }
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0)
    throw new Error(`Arquivo de saída ausente ou vazio: ${outputPath}`);
}

try {
  const config = loadConfig();
  requireValidConfig(config);
  const videoArgumentIndex = process.argv.indexOf("--video");
  const videoFromEquals = process.argv.find((argument) => argument.startsWith("--video="));
  const requestedVideoId = videoFromEquals
    ? videoFromEquals.slice("--video=".length)
    : videoArgumentIndex >= 0
      ? process.argv[videoArgumentIndex + 1]
      : null;
  const videosToRender = requestedVideoId
    ? config.videos.filter((video) => video.id === requestedVideoId)
    : config.videos;
  if (requestedVideoId && videosToRender.length === 0)
    throw new Error(`Vídeo desconhecido em --video: ${requestedVideoId}`);
  const sizeArgumentIndex = process.argv.indexOf("--size");
  const sizeFromEquals = process.argv.find((argument) => argument.startsWith("--size="));
  const requestedSizeId = sizeFromEquals
    ? sizeFromEquals.slice("--size=".length)
    : sizeArgumentIndex >= 0
      ? process.argv[sizeArgumentIndex + 1]
      : null;
  const sizesToRender = requestedSizeId
    ? config.sizes.filter((size) => size.id === requestedSizeId)
    : config.sizes;
  if (requestedSizeId && sizesToRender.length === 0)
    throw new Error(`Dimensão desconhecida em --size: ${requestedSizeId}`);
  ensureFfmpeg();
  fs.mkdirSync(RENDERED_VIDEO_DIR, { recursive: true });
  const total = videosToRender.length * sizesToRender.length;
  let index = 0;
  for (const video of videosToRender)
    for (const size of sizesToRender)
      renderVideo(video, size, config, ++index, total);
  console.log(`\nVídeos processados: ${total}/${total}.`);
} catch (error) {
  console.error(`\nERRO: ${error.message}`);
  process.exitCode = 1;
}
