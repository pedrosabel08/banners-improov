# Gerador de criativos HTML5 — Improov

Projeto local que combina vídeos, frases/CTAs e formatos de mídia para gerar **180 anúncios HTML5 independentes**, além de 30 versões de vídeo recortadas com FFmpeg. O texto permanece em HTML/CSS; alterar uma frase não exige renderizar os vídeos novamente.

## Requisitos

- Windows com PowerShell.
- Node.js 18 ou superior e npm.
- FFmpeg com encoder `libx264` disponível no `PATH` (o `ffprobe` é útil para inspecionar novas fontes).
- Não há dependências npm externas. `npm install` não é necessário.

Confira as ferramentas no PowerShell:

```powershell
node --version
npm.cmd --version
ffmpeg -version
```

## Estrutura

```text
source/
  videos/                 Cópias locais dos cinco vídeos de entrada
  assets/                 Logo original IMPROOV_TOP.gif
  config.json             ClickTag, frases, formatos e focal points
template/
  index.html              Único template HTML; recebe o CSS inline na geração
  style.css               CSS base e os seis presets, embutidos em cada anúncio
scripts/
  check-config.js         Verifica entradas e configuração
  render-videos.js        Gera uma versão de vídeo por vídeo/formato
  generate.js             Gera os anúncios em dist/
  generate-preview.js     Monta a revisão visual em preview/
  validate.js             Confere os 180 anúncios e seus pesos
  package.ps1             Empacota cada anúncio em um ZIP individual
  lib/common.js           Caminhos e validações compartilhados
rendered-videos/          30 MP4 processados, reutilizados pelos textos
dist/                     180 pastas com index.html (CSS inline), video.mp4 e logo.gif
preview/                  Página de revisão e relatório de pesos CSV
packages/                 ZIPs opcionais, um arquivo por anúncio
frases.html               Referência fornecida com as seis frases e CTAs
```

Os cinco vídeos entregues foram copiados de `C:\Users\usuario\Downloads\animacoes-html5` para `source/videos/`. Os arquivos originais naquela pasta não são editados, renomeados, movidos ou excluídos.

## Onde editar

Abra `source/config.json` para alterar todo o conteúdo de campanha:

- **Frases e CTAs:** edite `texts`; há seis itens identificados de `F01` a `F06`. O texto inicial corresponde a `frases.html`.
- **Destino do clique:** altere somente `clickTag`. O anúncio inteiro é um link e abre esse destino.
- **Logo:** `logo.file` seleciona o GIF em `source/assets/`; `logo.alt` define o texto alternativo. O gerador o inclui em cada criativo como `logo.gif`. O arquivo atual tem 1830×396 px e sua animação permanece em GIF.
- **Vídeos:** cada item de `videos` associa um ID (`V01`–`V05`) ao nome do arquivo dentro de `source/videos/`.
- **Dimensões:** `sizes` lista os seis formatos suportados. O ID precisa ser `largura x altura`, sem espaços, como `300x250`.
- **Qualidade de vídeo:** `render.crf` controla a qualidade/tamanho H.264 (valor menor dá mais qualidade e arquivos maiores); `render.preset` controla o tempo de codificação.
- **Altura do vídeo processado:** um formato pode definir `videoHeight` acima da altura visível do anúncio. Para 728×90, a saída de vídeo mede 728×120; o CSS desloca o vídeo 15 px para cima e o contêiner recorta o excedente. A área e a meta do anúncio continuam em 728×90.
- **Acréscimo por vídeo:** `videoHeightOffsets` soma pixels à altura processada de todas as dimensões daquele vídeo. Atualmente V04 (`fg-talls-f-1-1080.mp4`) soma 80 px; em 728×90, isso se soma aos 30 px extras do formato e resulta em vídeo 728×200.

Se substituir ou adicionar um vídeo, coloque uma cópia em `source/videos/` e atualize o nome no config. O gerador espera exatamente cinco vídeos nesta versão do projeto.

### Enquadramento (focal points)

Edite `focalPoints` no config por vídeo e por formato:

```json
"focalPoints": {
  "V01": {
    "300x250": { "x": 50, "y": 50 },
    "300x600": { "x": 70, "y": 50 }
  }
}
```

Os valores são percentuais de **posição dentro do excesso que será cortado**: `x: 0` começa pela esquerda, `x: 100` desloca até a direita; `y: 0` começa pelo topo e `y: 100` desloca até a base. O valor padrão, quando a dimensão não aparece, é 50/50 (centro). Isso permite deslocar o crop para preservar uma pessoa, produto ou outro assunto importante. O FFmpeg primeiro redimensiona mantendo a proporção, depois corta o excesso; o vídeo nunca é esticado. Mudou o focal point? Rode novamente `npm run videos` e depois gere os anúncios.

## Layouts e clickTag

`template/style.css` contém as regras comuns e os presets `.size-300x250`, `.size-728x90`, `.size-320x480`, `.size-970x250`, `.size-300x600` e `.size-320x100`. Cada preset define posição, alinhamento, largura e escala do texto, line-height, CTA, margens, espaçamento, gradiente e posição/tamanho da logo (`--logo-offset-top`, `--logo-offset-left`, `--logo-width`). Os offsets da logo são relativos à caixa `.content`. Ajuste os valores nesse arquivo para atualizar todos os anúncios daquele formato na próxima geração. `template/index.html` é o único template: o gerador substitui dimensão, classe, headline, CTA, logo e ClickTag.

Cada pasta `dist/Vxx_Fxx_DIMENSÃO/` inclui apenas `index.html` (com CSS dentro de uma tag `<style>`) e seu próprio `video.mp4`, sem CDN, fonte remota, API, biblioteca externa ou stylesheet separado. A tag `<meta name="ad.size">` informa o formato; `clickTag` fica configurável globalmente no JSON.

## Executar

Na pasta deste projeto, abra PowerShell e rode:

```powershell
npm.cmd run build
```

O build executa em sequência e para se uma etapa falhar:

1. Valida o config, os cinco vídeos de entrada e as dimensões.
2. Gera 30 arquivos em `rendered-videos/` — uma vez por vídeo e formato.
3. Gera 180 anúncios em `dist/` — as seis versões de frase reaproveitam cada MP4 renderizado.
4. Gera `preview/index.html`.
5. Valida quantidade, arquivos, meta, clickTag, frase, CTA, referência de mídia e tamanho.

Também é possível executar etapas separadamente:

```powershell
npm.cmd run config:check
npm.cmd run videos
npm.cmd run generate
npm.cmd run preview
npm.cmd run preview:design
npm.cmd run validate
```

Para reprocessar somente os cinco vídeos do formato 728×90 (em 728×120, ou 728×200 para V04), execute `npm.cmd run videos:728x90`. Para reprocessar as seis dimensões de V04, execute `npm.cmd run videos:v04`. Os demais vídeos não são regravados.

Para revisar, abra `preview/index.html` no navegador. A página agrupa por vídeo e depois por frase/CTA, com seis quadros por grupo; “Abrir anúncio” abre o criativo em tamanho próprio.

Para ajustar o layout **antes de gerar os 180 criativos**, edite `template/style.css` e execute `npm.cmd run preview:design`. Abra `preview/design-review.html` e selecione vídeo, frase e dimensão nos controles. Esse preview usa os vídeos processados em `rendered-videos/`, mas não modifica nem exige que `dist/` seja gerado. Depois de alterar o CSS, rode `preview:design` novamente para atualizar a página. Se ainda não houver vídeos processados, execute `npm.cmd run videos` uma vez; não é preciso renderizá-los novamente para ajustes somente de CSS.

## Validação e pesos

O validador confirma as 180 combinações esperadas, verifica cada pasta e lista eventuais erros com o ID do criativo. `preview/validation-report.csv` detalha HTML, CSS inline, vídeo e logo por anúncio. O CSS está incluído no tamanho de HTML, portanto o total soma HTML, vídeo e logo sem contar o CSS duas vezes. Não há limite de peso predefinido: o relatório permite comparar os pacotes com a especificação da plataforma de mídia.

## ZIPs individuais

O build gera automaticamente os 180 ZIPs, um por criativo. Execute este comando para repetir somente a etapa de empacotamento depois de alterar os arquivos em dist/:

```powershell
npm.cmd run package
```

Cada ZIP contém somente index.html, video.mp4 e logo.gif daquele criativo.