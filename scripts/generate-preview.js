/** Creates one local review page grouped by source video and text combination. */
const fs = require("node:fs");
const path = require("node:path");
const {
  loadConfig,
  requireValidConfig,
  creativeId,
  ROOT,
  DIST_DIR,
} = require("./lib/common");

try {
  const config = loadConfig();
  requireValidConfig(config);
  const sections = [];
  for (const video of config.videos) {
    const textGroups = config.texts
      .map((text) => {
        const tiles = config.sizes
          .map((size) => {
            const id = creativeId(video, text, size);
            const width = Math.round(size.width / 2);
            const height = Math.round(size.height / 2);
            return `<article class="tile"><h4>${size.id}</h4><div class="frame" style="width:${width}px;height:${height}px"><iframe title="${id}" src="../dist/${id}/index.html" loading="lazy" sandbox="allow-scripts allow-popups"></iframe></div><a href="../dist/${id}/index.html" target="_blank" rel="noopener">Abrir anúncio</a></article>`;
          })
          .join("\n");
        return `<section class="text-group"><h3>${text.id} · ${escapeHtml(text.headline)}</h3><p class="cta-label">CTA: ${escapeHtml(text.cta)}</p><div class="tiles">${tiles}</div></section>`;
      })
      .join("\n");
    sections.push(
      `<section class="video-group"><h2>${video.id} · ${escapeHtml(video.file)}</h2>${textGroups}</section>`,
    );
  }
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview dos criativos Improov</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#20262c;font-family:Arial,Helvetica,sans-serif}header{padding:26px 32px;background:#192129;color:#fff}h1{margin:0 0 8px;font-size:24px}header p{margin:0;color:#d4dbe1}.video-group{padding:25px 32px;border-bottom:1px solid #d9dee3}.video-group>h2{margin:0 0 22px;font-size:20px}.text-group{margin:0 0 28px}.text-group h3{margin:0 0 5px;font-size:15px}.cta-label{margin:0 0 12px;color:#59636d;font-size:13px}.tiles{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px}.tile{padding:10px;background:#fff;border:1px solid #dce1e5;border-radius:5px;box-shadow:0 2px 5px #17212a12}.tile h4{margin:0 0 7px;font-size:12px}.frame{position:relative;overflow:hidden;background:#20262c}.frame iframe{position:absolute;top:0;left:0;width:200%;height:200%;border:0;transform:scale(.5);transform-origin:top left}.tile>a{display:inline-block;margin-top:7px;font-size:11px;color:#215e82}</style></head><body>
<header><h1>Preview dos criativos HTML5</h1><p>${config.videos.length} vídeos · ${config.texts.length} frases/CTAs · ${config.sizes.length} dimensões · ${config.videos.length * config.texts.length * config.sizes.length} anúncios</p></header>
${sections.join("\n")}</body></html>`;
  const outputDirectory = path.join(ROOT, "preview");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "index.html"), html, "utf8");
  console.log(
    `Preview criado: ${path.join(outputDirectory, "index.html")} (${config.videos.length * config.texts.length * config.sizes.length} quadros).`,
  );
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  process.exitCode = 1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
