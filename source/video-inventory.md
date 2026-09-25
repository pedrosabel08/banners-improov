# Inventário dos vídeos de entrada

Inspecionados em 2026-09-25 com `ffprobe`. Os arquivos abaixo foram copiados para `source/videos/`; os originais na pasta Downloads não foram alterados.

| ID | Arquivo | Tamanho original | Resolução | Proporção | Duração | Vídeo | FPS | Áudio |
|---|---|---:|---:|---:|---:|---|---:|---|
| V01 | `animacao-2-alp-sc-conceito-1080.mp4` | 7,879,740 bytes | 1920×1080 | 16:9 | 26.700 s | H.264, yuv420p | 30 | Não |
| V02 | `animacao-6-aya-kar-piscina-maior-1080.mp4` | 26,031,623 bytes | 1920×1080 | 16:9 | 10.000 s | H.264, yuv420p | 30 | Não |
| V03 | `animacao-gt-lac-tracking-0044-1080.mp4` | 14,036,971 bytes | 1920×1080 | 16:9 inferido da resolução | 20.734 s | H.264, yuv420p | 30 | Não |
| V04 | `fg-talls-f-1-1080.mp4` | 5,152,257 bytes | 1920×1080 | 16:9 | 20.700 s | H.264, yuv420p | 30 | Não |
| V05 | `hsa-mon-tracking-0038-lazer-ai-slow-down-1080.mp4` | 6,758,022 bytes | 1920×1080 | 16:9 | 16.434 s | H.264, yuv420p | 60 | Não |

Os cinco arquivos usam contêiner MP4/H.264 e a mesma resolução. A diferença relevante é que V05 tem o dobro da taxa de quadros dos outros quatro. V02 tem a maior taxa de bits de origem (aproximadamente 20.8 Mbps); isso pode afetar o tamanho antes do processamento. Em V03, ffprobe não retornou `display_aspect_ratio`; 1920×1080 corresponde matematicamente a 16:9.
