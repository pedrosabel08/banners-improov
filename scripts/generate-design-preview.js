/**
 * generate-design-preview.js
 * Creates a one-ad layout workbench for checking CSS before generating all ads.
 * It reuses rendered background videos and does not write anything into dist/.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, requireValidConfig, VIDEO_SOURCE_DIR, RENDERED_VIDEO_DIR, TEMPLATE_CSS_PATH, ROOT } = require('./lib/common');

function scriptJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function ensureRenderedVideos(config) {
  for (const video of config.videos) {
    if (!fs.existsSync(path.join(VIDEO_SOURCE_DIR, video.file))) throw new Error(`Vídeo original ausente: source/videos/${video.file}`);
    for (const size of config.sizes) {
      const output = path.join(RENDERED_VIDEO_DIR, `${video.id}_${size.id}.mp4`);
      if (!fs.existsSync(output)) throw new Error(`Vídeo processado ausente: rendered-videos/${video.id}_${size.id}.mp4. Execute npm.cmd run videos uma vez antes do preview.`);
    }
  }
}

function buildWorkbench(config, css) {
  const videos = config.videos.map((item) => ({ id: item.id, file: item.file }));
  const texts = config.texts.map((item) => ({ id: item.id, headline: item.headline, cta: item.cta }));
  const sizes = config.sizes.map((item) => ({ id: item.id, width: item.width, height: item.height }));
  const page = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview de layout — Improov</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f6;color:#20262c;font-family:Arial,Helvetica,sans-serif}.toolbar{display:flex;align-items:end;gap:18px;flex-wrap:wrap;padding:17px 22px;background:#192129;color:#fff}.toolbar h1{width:100%;margin:0;font-size:18px}.field{display:grid;gap:5px;font-size:12px}.field select{min-width:180px;padding:8px;border:1px solid #707b84;border-radius:3px;background:white;color:#192129}.status{margin-left:auto;align-self:center;color:#dbe2e8;font-size:12px}.stage{height:calc(100vh - 112px);min-height:300px;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:20px}.stage-bg{position:absolute;inset:112px 0 0;background:linear-gradient(135deg,#e7ebee,#f8f9fa);pointer-events:none}.scale-wrap{position:relative;z-index:1}.scale-wrap iframe{position:absolute;top:0;left:0;border:0;transform-origin:top left;background:#20262c;box-shadow:0 10px 35px #17212a35}.hint{position:absolute;z-index:2;bottom:10px;left:0;right:0;text-align:center;color:#58636d;font-size:12px;pointer-events:none}@media(max-width:700px){.status{width:100%;margin-left:0}.toolbar{gap:10px}.field select{min-width:130px}.stage-bg{inset:176px 0 0}.stage{height:calc(100vh - 176px)}}
</style></head><body>
<header class="toolbar"><h1>Preview de layout antes de gerar os criativos</h1>
<label class="field">Vídeo<select id="video-select"></select></label>
<label class="field">Frase / CTA<select id="text-select"></select></label>
<label class="field">Dimensão<select id="size-select"></select></label>
<span class="status" id="status"></span></header>
<div class="stage-bg"></div><main class="stage" id="stage"><div class="scale-wrap" id="scale-wrap"><iframe id="creative-frame" title="Preview do anúncio" sandbox="allow-scripts allow-same-origin"></iframe></div></main>
<div class="hint">Edite template/style.css e rode novamente <b>npm.cmd run preview:design</b> para revisar os ajustes.</div>
<script>
const videos=${scriptJson(videos)};const texts=${scriptJson(texts)};const sizes=${scriptJson(sizes)};const clickTag=${scriptJson(config.clickTag)};const logo=${scriptJson(config.logo)};const videoHeightOffsets=${scriptJson(config.videoHeightOffsets || {})};const creativeCss=${scriptJson(css)};
const videoSelect=document.getElementById('video-select');const textSelect=document.getElementById('text-select');const sizeSelect=document.getElementById('size-select');const stage=document.getElementById('stage');const wrap=document.getElementById('scale-wrap');const frame=document.getElementById('creative-frame');
function fillSelect(select,items,label){select.innerHTML=items.map((item)=>'<option value="'+item.id+'">'+item.id+' — '+label(item)+'</option>').join('');}
fillSelect(videoSelect,videos,(item)=>item.file);fillSelect(textSelect,texts,(item)=>item.headline);fillSelect(sizeSelect,sizes,(item)=>item.id);
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function updatePreview(){const video=videos.find((item)=>item.id===videoSelect.value);const text=texts.find((item)=>item.id===textSelect.value);const size=sizes.find((item)=>item.id===sizeSelect.value);const scale=Math.min((stage.clientWidth-48)/size.width,(stage.clientHeight-48)/size.height,1);wrap.style.width=Math.round(size.width*scale)+'px';wrap.style.height=Math.round(size.height*scale)+'px';frame.style.width=size.width+'px';frame.style.height=size.height+'px';frame.style.transform='scale('+scale+')';document.getElementById('status').textContent=video.id+' · '+text.id+' · '+size.id;const halfVideoOffset=(videoHeightOffsets[video.id]||0)/2;const creative='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width='+size.width+',initial-scale=1"><meta name="ad.size" content="width='+size.width+',height='+size.height+'"><script>var clickTag='+JSON.stringify(clickTag)+';<\\/script><style>'+creativeCss+'</style></head><body class="size-'+size.id+'" style="--video-specific-extra-top:'+halfVideoOffset+'px;--video-specific-extra-bottom:'+halfVideoOffset+'px"><a class="click-through" href="javascript:window.open(window.clickTag)" aria-label="'+escapeHtml(text.headline+' — '+text.cta)+'"><div id="container"><video class="background-video" autoplay muted loop playsinline aria-hidden="true"><source src="../rendered-videos/'+video.id+'_'+size.id+'.mp4" type="video/mp4"></video><div class="content"><img class="brand-logo" src="../source/assets/'+escapeHtml(logo.file)+'" alt="'+escapeHtml(logo.alt)+'"><h1 class="headline">'+escapeHtml(text.headline)+'</h1><span class="cta">'+escapeHtml(text.cta)+'</span></div></div></a></body></html>';frame.srcdoc=creative;}
for(const control of [videoSelect,textSelect,sizeSelect])control.addEventListener('change',updatePreview);window.addEventListener('resize',updatePreview);updatePreview();
</script></body></html>`;
  return page;
}

try {
  const config = loadConfig();
  requireValidConfig(config);
  ensureRenderedVideos(config);
  const css = fs.readFileSync(TEMPLATE_CSS_PATH, 'utf8');
  const outputPath = path.join(ROOT, 'preview', 'design-review.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildWorkbench(config, css), 'utf8');
  console.log(`Preview de layout pronto: ${outputPath}`);
  console.log('Abra o arquivo no navegador; altere vídeo, frase ou dimensão pelos seletores.');
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  process.exitCode = 1;
}
