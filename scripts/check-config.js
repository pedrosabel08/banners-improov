/** Checks the editable campaign config and source video inventory without rendering. */
const fs = require("node:fs");
const path = require("node:path");
const {
  loadConfig,
  requireValidConfig,
  VIDEO_SOURCE_DIR,
} = require("./lib/common");

try {
  const config = loadConfig();
  requireValidConfig(config);
  const sourceVideos = fs
    .readdirSync(VIDEO_SOURCE_DIR)
    .filter((file) => /\.(mp4|mov|m4v|webm)$/i.test(file));
  if (sourceVideos.length !== config.videos.length)
    throw new Error(
      `source/videos contém ${sourceVideos.length} vídeos suportados; config.json declara ${config.videos.length}.`,
    );
  console.log(
    `Configuração válida: ${config.videos.length} vídeos, ${config.texts.length} textos e ${config.sizes.length} dimensões.`,
  );
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  process.exitCode = 1;
}
