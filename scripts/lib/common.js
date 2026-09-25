/** Shared paths and strict input validation used by the project scripts. */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(ROOT, "source", "config.json");
const VIDEO_SOURCE_DIR = path.join(ROOT, "source", "videos");
const SOURCE_ASSET_DIR = path.join(ROOT, "source", "assets");
const RENDERED_VIDEO_DIR = path.join(ROOT, "rendered-videos");
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_HTML_PATH = path.join(ROOT, "template", "index.html");
const TEMPLATE_CSS_PATH = path.join(ROOT, "template", "style.css");
const EXPECTED_SIZE_IDS = [
  "300x250",
  "728x90",
  "320x480",
  "970x250",
  "300x600",
  "320x100",
];

function fail(message) {
  throw new Error(message);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH))
    fail(`Configuração não encontrada: ${CONFIG_PATH}`);
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (error) {
    fail(`config.json inválido: ${error.message}`);
  }
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object")
    return ["A raiz de config.json deve ser um objeto JSON."];
  if (
    typeof config.clickTag !== "string" ||
    !/^https?:\/\//i.test(config.clickTag)
  )
    errors.push("clickTag deve ser uma URL http:// ou https://.");
  if (
    !config.logo ||
    typeof config.logo.file !== "string" ||
    !config.logo.file.trim() ||
    path.basename(config.logo.file) !== config.logo.file
  )
    errors.push("logo.file deve conter o nome de um arquivo dentro de source/assets/.");
  if (!config.logo || typeof config.logo.alt !== "string" || !config.logo.alt.trim())
    errors.push("logo.alt deve conter um texto alternativo.");
  if (!Array.isArray(config.videos) || config.videos.length !== 5)
    errors.push(
      `Esperados exatamente 5 vídeos na configuração; encontrados ${config.videos?.length ?? 0}.`,
    );
  if (!Array.isArray(config.texts) || config.texts.length !== 6)
    errors.push(
      `Esperadas exatamente 6 combinações de frase/CTA; encontradas ${config.texts?.length ?? 0}.`,
    );
  if (!Array.isArray(config.sizes) || config.sizes.length !== 6)
    errors.push(
      `Esperadas exatamente 6 dimensões; encontradas ${config.sizes?.length ?? 0}.`,
    );

  const ids = new Set();
  for (const [index, video] of (config.videos || []).entries()) {
    if (!video || !/^V\d{2}$/.test(video.id || ""))
      errors.push(`Vídeo ${index + 1}: id deve seguir V01, V02...`);
    if (!video || typeof video.file !== "string" || !video.file.trim())
      errors.push(`Vídeo ${video?.id || index + 1}: nome do arquivo ausente.`);
    else if (path.basename(video.file) !== video.file)
      errors.push(
        `Vídeo ${video.id}: file deve conter somente o nome do arquivo, sem caminho.`,
      );
    if (video?.id && ids.has(video.id))
      errors.push(`ID de vídeo duplicado: ${video.id}.`);
    if (video?.id) ids.add(video.id);
  }
  for (const [videoId, heightOffset] of Object.entries(config.videoHeightOffsets || {})) {
    if (!ids.has(videoId))
      errors.push(`videoHeightOffsets referencia vídeo desconhecido: ${videoId}.`);
    if (!Number.isInteger(heightOffset) || heightOffset < 0)
      errors.push(`videoHeightOffsets.${videoId} deve ser um inteiro positivo ou zero.`);
  }

  const textIds = new Set();
  for (const [index, text] of (config.texts || []).entries()) {
    if (!text || !/^F\d{2}$/.test(text.id || ""))
      errors.push(`Combinação ${index + 1}: id deve seguir F01, F02...`);
    if (!text || typeof text.headline !== "string" || !text.headline.trim())
      errors.push(`Texto ${text?.id || index + 1}: headline ausente.`);
    if (!text || typeof text.cta !== "string" || !text.cta.trim())
      errors.push(`Texto ${text?.id || index + 1}: CTA ausente.`);
    if (text?.id && textIds.has(text.id))
      errors.push(`ID de texto duplicado: ${text.id}.`);
    if (text?.id) textIds.add(text.id);
  }

  const sizeIds = new Set();
  for (const [index, size] of (config.sizes || []).entries()) {
    if (
      !size ||
      !Number.isInteger(size.width) ||
      size.width <= 0 ||
      !Number.isInteger(size.height) ||
      size.height <= 0
    )
      errors.push(
        `Dimensão ${index + 1}: width/height devem ser inteiros positivos.`,
      );
    if (size?.videoHeight !== undefined && (!Number.isInteger(size.videoHeight) || size.videoHeight <= 0))
      errors.push(`Dimensão ${size.id}: videoHeight deve ser um inteiro positivo quando informado.`);
    if (!size || size.id !== `${size.width}x${size.height}`)
      errors.push(
        `Dimensão ${size?.id || index + 1}: id deve corresponder a width x height.`,
      );
    if (size?.id && sizeIds.has(size.id))
      errors.push(`Dimensão duplicada: ${size.id}.`);
    if (size?.id) sizeIds.add(size.id);
  }
  if (config.sizes && EXPECTED_SIZE_IDS.some((id) => !sizeIds.has(id)))
    errors.push(`Dimensões devem incluir: ${EXPECTED_SIZE_IDS.join(", ")}.`);

  for (const [videoId, perSize] of Object.entries(config.focalPoints || {})) {
    if (!ids.has(videoId))
      errors.push(`focalPoints referencia vídeo desconhecido: ${videoId}.`);
    if (!perSize || typeof perSize !== "object" || Array.isArray(perSize)) {
      errors.push(`focalPoints.${videoId} deve ser um objeto.`);
      continue;
    }
    for (const [sizeId, point] of Object.entries(perSize)) {
      if (!sizeIds.has(sizeId))
        errors.push(
          `focalPoints.${videoId} referencia dimensão desconhecida: ${sizeId}.`,
        );
      if (
        !point ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        point.x < 0 ||
        point.x > 100 ||
        point.y < 0 ||
        point.y > 100
      )
        errors.push(
          `focalPoints.${videoId}.${sizeId}: x e y devem ser percentuais entre 0 e 100.`,
        );
    }
  }
  if (
    config.render &&
    (!Number.isInteger(config.render.crf) ||
      config.render.crf < 0 ||
      config.render.crf > 51)
  )
    errors.push("render.crf deve ser inteiro entre 0 e 51.");
  return errors;
}

function requireValidConfig(config) {
  const errors = validateConfig(config);
  if (errors.length) fail(`Configuração inválida:\n- ${errors.join("\n- ")}`);
  for (const video of config.videos) {
    if (!fs.existsSync(path.join(VIDEO_SOURCE_DIR, video.file)))
      fail(
        `Vídeo original configurado não encontrado: source/videos/${video.file}`,
      );
  }
  if (!fs.existsSync(path.join(SOURCE_ASSET_DIR, config.logo.file)))
    fail(`Logo configurada não encontrada: source/assets/${config.logo.file}`);
}

function creativeId(video, text, size) {
  return `${video.id}_${text.id}_${size.id}`;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bytesLabel(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

module.exports = {
  ROOT,
  CONFIG_PATH,
  VIDEO_SOURCE_DIR,
  SOURCE_ASSET_DIR,
  RENDERED_VIDEO_DIR,
  DIST_DIR,
  TEMPLATE_HTML_PATH,
  TEMPLATE_CSS_PATH,
  EXPECTED_SIZE_IDS,
  loadConfig,
  validateConfig,
  requireValidConfig,
  creativeId,
  htmlEscape,
  bytesLabel,
  fail,
};
