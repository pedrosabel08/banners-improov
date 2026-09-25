/** Validates every generated ad and writes per-creative file-weight measurements. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  loadConfig,
  requireValidConfig,
  creativeId,
  htmlEscape,
  bytesLabel,
  VIDEO_SOURCE_DIR,
  SOURCE_ASSET_DIR,
  RENDERED_VIDEO_DIR,
  DIST_DIR,
  ROOT,
} = require("./lib/common");

function fileSize(directory, filename) {
  const target = path.join(directory, filename);
  return fs.existsSync(target) && fs.statSync(target).isFile()
    ? fs.statSync(target).size
    : null;
}

function probeVideoSize(videoPath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      videoPath,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.error || result.status !== 0) return null;
  try {
    const stream = JSON.parse(result.stdout).streams?.[0];
    return stream ? { width: stream.width, height: stream.height } : null;
  } catch {
    return null;
  }
}

function main() {
  const config = loadConfig();
  requireValidConfig(config);
  const expectedTotal =
    config.videos.length * config.texts.length * config.sizes.length;
  const actualSourceCount = fs
    .readdirSync(VIDEO_SOURCE_DIR)
    .filter((file) => /\.(mp4|mov|m4v|webm)$/i.test(file)).length;
  const processedCount = config.videos.reduce(
    (count, video) =>
      count +
      config.sizes.filter((size) =>
        fs.existsSync(
          path.join(RENDERED_VIDEO_DIR, `${video.id}_${size.id}.mp4`),
        ),
      ).length,
    0,
  );
  const errors = [];
  const measurements = [];
  const videoDimensions = new Map();
  let validCount = 0;

  if (!fs.existsSync(DIST_DIR))
    throw new Error("Pasta dist/ não encontrada. Execute npm run generate.");
  const directories = new Set(
    fs
      .readdirSync(DIST_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  for (const video of config.videos)
    for (const text of config.texts)
      for (const size of config.sizes) {
        const id = creativeId(video, text, size);
        const directory = path.join(DIST_DIR, id);
        const creativeErrors = [];
        if (!directories.has(id)) {
          creativeErrors.push("pasta do criativo não existe");
          errors.push({ id, messages: creativeErrors });
          measurements.push({
            id,
            html: null,
            css: null,
            video: null,
            logo: null,
            total: null,
          });
          continue;
        }
        const htmlBytes = fileSize(directory, "index.html");
        const videoBytes = fileSize(directory, "video.mp4");
        const logoBytes = fileSize(directory, "logo.gif");
        if (htmlBytes === null)
          creativeErrors.push("index.html não encontrado");
        if (videoBytes === null)
          creativeErrors.push("video.mp4 não encontrado");
        if (logoBytes === null)
          creativeErrors.push("logo.gif não encontrado");
        const html =
          htmlBytes === null
            ? ""
            : fs.readFileSync(path.join(directory, "index.html"), "utf8");
        const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
        const cssBytes = styleMatch
          ? Buffer.byteLength(styleMatch[1], "utf8")
          : null;
        if (!styleMatch) creativeErrors.push("CSS inline não encontrado");
        if (/<link\b[^>]*stylesheet/i.test(html))
          creativeErrors.push("CSS externo não permitido no criativo");
        const metaMatch = html.match(
          /<meta\b(?=[^>]*\bname=["']ad\.size["'])(?=[^>]*\bcontent=["']width=(\d+),height=(\d+)["'])[^>]*>/i,
        );
        if (
          !metaMatch ||
          Number(metaMatch[1]) !== size.width ||
          Number(metaMatch[2]) !== size.height
        )
          creativeErrors.push("meta ad.size ausente ou incorreta");
        if (
          !/\bvar\s+clickTag\s*=/.test(html) ||
          !html.includes(JSON.stringify(config.clickTag))
        )
          creativeErrors.push("clickTag ausente ou diferente da configuração");
        if (!html.includes(htmlEscape(text.headline)))
          creativeErrors.push("headline ausente");
        if (!html.includes(htmlEscape(text.cta)))
          creativeErrors.push("CTA ausente");
        if (!/<source\s+src="video\.mp4"/i.test(html))
          creativeErrors.push("referência local a video.mp4 ausente");
        if (!/<img\b[^>]*src="logo\.gif"/i.test(html))
          creativeErrors.push("referência local a logo.gif ausente");
        if (!fs.existsSync(path.join(SOURCE_ASSET_DIR, config.logo.file)))
          creativeErrors.push(`asset original da logo ausente: ${config.logo.file}`);
        if (
          !fs.existsSync(
            path.join(RENDERED_VIDEO_DIR, `${video.id}_${size.id}.mp4`),
          )
        )
          creativeErrors.push("vídeo processado correspondente ausente");
        const renderedVideoPath = path.join(
          RENDERED_VIDEO_DIR,
          `${video.id}_${size.id}.mp4`,
        );
        if (fs.existsSync(renderedVideoPath)) {
          if (!videoDimensions.has(renderedVideoPath))
            videoDimensions.set(
              renderedVideoPath,
              probeVideoSize(renderedVideoPath),
            );
          const actualDimensions = videoDimensions.get(renderedVideoPath);
          const expectedWidth = size.videoWidth || size.width;
          const expectedHeight =
            (size.videoHeight || size.height) +
            (config.videoHeightOffsets?.[video.id] || 0);
          if (
            !actualDimensions ||
            actualDimensions.width !== expectedWidth ||
            actualDimensions.height !== expectedHeight
          )
            creativeErrors.push(
              `resolução do vídeo processado incorreta; esperado ${expectedWidth}x${expectedHeight}`,
            );
        }
        if (creativeErrors.length)
          errors.push({ id, messages: creativeErrors });
        else validCount += 1;
        // css_bytes é uma medida informativa já contida em html_bytes; não somar CSS duas vezes.
        measurements.push({
          id,
          html: htmlBytes,
          css: cssBytes,
          video: videoBytes,
          logo: logoBytes,
          total: [htmlBytes, videoBytes, logoBytes].every(Number.isFinite)
            ? htmlBytes + videoBytes + logoBytes
            : null,
        });
      }

  for (const id of directories)
    if (
      !config.videos.some((video) =>
        config.texts.some((text) =>
          config.sizes.some((size) => creativeId(video, text, size) === id),
        ),
      )
    )
      errors.push({
        id,
        messages: ["pasta extra não corresponde a uma combinação configurada"],
      });
  const reportPath = path.join(ROOT, "preview", "validation-report.csv");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const csvRows = [
    "creative_id,html_bytes,css_bytes,video_bytes,logo_bytes,total_bytes",
    ...measurements.map((row) =>
      [
        row.id,
        row.html ?? "",
        row.css ?? "",
        row.video ?? "",
        row.logo ?? "",
        row.total ?? "",
      ].join(","),
    ),
  ];
  fs.writeFileSync(reportPath, `${csvRows.join("\n")}\n`, "utf8");

  console.log("VALIDAÇÃO CONCLUÍDA\n");
  console.log(`Vídeos originais: ${actualSourceCount}`);
  console.log(`Vídeos processados: ${processedCount}`);
  console.log(`Combinações HTML: ${directories.size}`);
  console.log(`\n${validCount}/${expectedTotal} criativos válidos.`);
  if (measurements.length) {
    const sum = (key) =>
      measurements.reduce((total, item) => total + (item[key] || 0), 0);
    console.log(
      `Pesos agregados — HTML (inclui CSS): ${bytesLabel(sum("html"))} | CSS inline: ${bytesLabel(sum("css"))} | vídeos: ${bytesLabel(sum("video"))} | logos: ${bytesLabel(sum("logo"))} | total: ${bytesLabel(sum("total"))}`,
    );
    console.log(`Detalhamento por criativo: ${reportPath}`);
  }
  if (errors.length) {
    console.error("\nERROS:\n");
    for (const error of errors)
      for (const message of error.messages)
        console.error(`${error.id}\n- ${message}`);
    return false;
  }
  if (actualSourceCount !== config.videos.length) {
    console.error(
      `\nERRO: esperados ${config.videos.length} vídeos originais, encontrados ${actualSourceCount}.`,
    );
    return false;
  }
  if (processedCount !== config.videos.length * config.sizes.length) {
    console.error(`\nERRO: quantidade de vídeos processados incorreta.`);
    return false;
  }
  if (validCount !== expectedTotal || directories.size !== expectedTotal) {
    console.error(
      `\nERRO: quantidade final deve ser exatamente ${expectedTotal}.`,
    );
    return false;
  }
  console.log("\nNenhum erro encontrado.");
  return true;
}

try {
  if (!main()) process.exitCode = 1;
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  process.exitCode = 1;
}
