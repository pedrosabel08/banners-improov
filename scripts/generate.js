/**
 * generate.js
 * Gera os HTMLs isolados em dist/ usando um único template e vídeos processados.
 * Este arquivo não invoca FFmpeg; cada vídeo de fundo é copiado para seis textos.
 */
const fs = require("node:fs");
const path = require("node:path");
const {
  loadConfig,
  requireValidConfig,
  creativeId,
  htmlEscape,
  VIDEO_SOURCE_DIR,
  SOURCE_ASSET_DIR,
  RENDERED_VIDEO_DIR,
  DIST_DIR,
  TEMPLATE_HTML_PATH,
  TEMPLATE_CSS_PATH,
} = require("./lib/common");

function substitute(template, values) {
  let output = template;
  for (const [key, value] of Object.entries(values))
    output = output.replaceAll(`{{${key}}}`, () => value);
  return output;
}

function safeScriptJson(value) {
  // Strings inside a script element must not be allowed to terminate the element.
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function splitHeadlinePhrases(headline) {
  return (
    headline.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((phrase) => phrase.trim()).filter(Boolean) ||
    [headline]
  );
}

function animatedHeadline(headline) {
  return splitHeadlinePhrases(headline)
    .map(
      (phrase, index) =>
        `<span class="headline-phrase" style="--phrase-delay: ${index * 0.9}s">${htmlEscape(phrase)}</span>`,
    )
    .join("");
}

function cssForSize(css, sizeId) {
  const sections = [
    ...css.matchAll(/\/\*\s*(\d+x\d+):[^\r\n]*\*\//g),
  ].filter((match) => match[1] in { '300x250': 1, '728x90': 1, '320x480': 1, '970x250': 1, '300x600': 1, '320x100': 1 });
  const selected = sections.find((section) => section[1] === sizeId);
  if (!selected) throw new Error(`Bloco CSS ausente para ${sizeId}.`);
  const start = selected.index;
  const nextSection = sections.find((section) => section.index > start);
  const end = nextSection ? nextSection.index : css.length;
  return `${css.slice(0, sections[0].index)}\n${css.slice(start, end)}`;
}

function generateCreative(
  video,
  text,
  size,
  config,
  template,
  css,
  index,
  total,
) {
  const id = creativeId(video, text, size);
  const directory = path.join(DIST_DIR, id);
  const renderedVideo = path.join(
    RENDERED_VIDEO_DIR,
    `${video.id}_${size.id}.mp4`,
  );
  if (!fs.existsSync(renderedVideo))
    throw new Error(
      `Vídeo processado ausente para ${id}: ${renderedVideo}. Execute npm run videos.`,
    );
  fs.mkdirSync(directory, { recursive: true });
  const html = substitute(template, {
    WIDTH: String(size.width),
    HEIGHT: String(size.height),
    SIZE_ID: size.id,
    CREATIVE_ID: id,
    CLICK_TAG: safeScriptJson(config.clickTag),
    VIDEO_OVERSCAN_TOP: String((config.videoHeightOffsets?.[video.id] || 0) / 2),
    VIDEO_OVERSCAN_BOTTOM: String((config.videoHeightOffsets?.[video.id] || 0) / 2),
    CSS: cssForSize(css, size.id),
    ARIA_LABEL: htmlEscape(`${text.headline} — ${text.cta}`),
    HEADLINE: animatedHeadline(text.headline),
    CTA: htmlEscape(text.cta),
    LOGO_ALT: htmlEscape(config.logo.alt),
  });
  fs.writeFileSync(path.join(directory, "index.html"), html, "utf8");
  // O CSS é embutido no HTML; cada pasta fica independente do ponto de vista dos assets.
  // O MP4 processado é copiado para permitir empacotamento de cada anúncio isoladamente.
  fs.copyFileSync(renderedVideo, path.join(directory, "video.mp4"));
  for (const [filename, suffix] of [
    ["poster.jpg", "poster"],
    ["backup.jpg", "backup"],
  ]) {
    const source = path.join(
      RENDERED_VIDEO_DIR,
      `${video.id}_${size.id}_${suffix}.jpg`,
    );
    if (!fs.existsSync(source))
      throw new Error(`Imagem de fallback ausente para ${id}: ${source}`);
    fs.copyFileSync(source, path.join(directory, filename));
  }
  fs.copyFileSync(
    path.join(SOURCE_ASSET_DIR, config.logo.file),
    path.join(directory, "logo.png"),
  );
  console.log(`[${index}/${total}] Criando ${id}`);
}

try {
  const config = loadConfig();
  requireValidConfig(config);
  if (!fs.existsSync(TEMPLATE_HTML_PATH) || !fs.existsSync(TEMPLATE_CSS_PATH))
    throw new Error(
      "template/index.html e template/style.css são necessários.",
    );
  const template = fs.readFileSync(TEMPLATE_HTML_PATH, "utf8");
  const css = fs.readFileSync(TEMPLATE_CSS_PATH, "utf8");
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  const total =
    config.videos.length * config.texts.length * config.sizes.length;
  let index = 0;
  for (const video of config.videos)
    for (const text of config.texts)
      for (const size of config.sizes)
        generateCreative(
          video,
          text,
          size,
          config,
          template,
          css,
          ++index,
          total,
        );
  console.log(`\nCriativos gerados: ${total}/${total}.`);
} catch (error) {
  console.error(`\nERRO: ${error.message}`);
  process.exitCode = 1;
}
