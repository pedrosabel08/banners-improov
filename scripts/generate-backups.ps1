$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfigText = [IO.File]::ReadAllText((Join-Path $ProjectRoot 'source/config.json'), [Text.Encoding]::UTF8)
$Config = $ConfigText | ConvertFrom-Json
$DistDirectory = Join-Path $ProjectRoot 'dist'
$GraphicsAssembly = [Reflection.Assembly]::LoadWithPartialName('System.Drawing')
if (-not $GraphicsAssembly) { throw 'System.Drawing não está disponível.' }

$layouts = @{
    '300x250' = @{ Logo = 112; Headline = 21; HeadlineRect = @(20, 104, 260, 96); CtaRect = @(20, 204, 180, 34); DarkTop = 96 }
    '728x90'  = @{ Logo = 100; Headline = 18; HeadlineRect = @(137, 12, 395, 66); CtaRect = @(548, 28, 158, 34); DarkTop = 0 }
    '320x480' = @{ Logo = 118; Headline = 26; HeadlineRect = @(25, 319, 270, 102); CtaRect = @(25, 426, 190, 42); DarkTop = 288 }
    '970x250' = @{ Logo = 132; Headline = 31; HeadlineRect = @(202, 76, 585, 112); CtaRect = @(817, 102, 150, 42); DarkTop = 20 }
    '300x600' = @{ Logo = 124; Headline = 25; HeadlineRect = @(25, 394, 250, 130); CtaRect = @(25, 540, 190, 40); DarkTop = 360 }
    '320x100' = @{ Logo = 94; Headline = 16; HeadlineRect = @(116, 13, 191, 74); CtaRect = @(13, 61, 99, 28); DarkTop = 0 }
}

$fontStyle = [System.Drawing.FontStyle]::Bold
$textColor = [System.Drawing.Brushes]::White
$smallFormat = [System.Drawing.StringFormat]::new()
$smallFormat.Alignment = [System.Drawing.StringAlignment]::Center
$smallFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$qualityEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
$qualityParameter = [System.Drawing.Imaging.Encoder]::Quality

foreach ($video in $Config.videos) {
    foreach ($text in $Config.texts) {
        foreach ($size in $Config.sizes) {
            $id = '{0}_{1}_{2}' -f $video.id, $text.id, $size.id
            $creativeDirectory = Join-Path $DistDirectory $id
            $backupPath = Join-Path $creativeDirectory 'backup.jpg'
            $tempBackupPath = Join-Path $creativeDirectory 'backup-rendered.jpg'
            $layout = $layouts[$size.id]
            $bitmap = [System.Drawing.Bitmap]::new([int]$size.width, [int]$size.height)
            $background = [System.Drawing.Image]::FromFile($backupPath)
            $logo = [System.Drawing.Image]::FromFile((Join-Path $ProjectRoot 'source/assets/IMPROOV_TOP.png'))
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
                $graphics.DrawImage($background, 0, 0, [int]$size.width, [int]$size.height)

                if ($size.id -eq '728x90' -or $size.id -eq '970x250') {
                    $shade = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(88, 0, 0, 0))
                    $graphics.FillRectangle($shade, 0, 0, [int]$size.width, [int]$size.height)
                    $shade.Dispose()
                } else {
                    $shade = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(165, 0, 0, 0))
                    $graphics.FillRectangle($shade, 0, [int]$layout.DarkTop, [int]$size.width, [int]$size.height - [int]$layout.DarkTop)
                    $shade.Dispose()
                }

                $logoHeight = [Math]::Round([int]$layout.Logo * $logo.Height / $logo.Width)
                $logoY = if ($size.id -eq '728x90') { 29 } else { 12 }
                $logoX = if ($size.id -eq '728x90') { 22 } elseif ($size.id -eq '970x250') { 38 } elseif ($size.id -eq '320x100') { 13 } else { 20 }
                $graphics.DrawImage($logo, [int]$logoX, [int]$logoY, [int]$layout.Logo, [int]$logoHeight)

                $headlineFont = [System.Drawing.Font]::new('Arial', [single]$layout.Headline, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
                $headlineRect = [System.Drawing.RectangleF]::new([single]$layout.HeadlineRect[0], [single]$layout.HeadlineRect[1], [single]$layout.HeadlineRect[2], [single]$layout.HeadlineRect[3])
                $graphics.DrawString([string]$text.headline, $headlineFont, $textColor, $headlineRect)
                $headlineFont.Dispose()

                $ctaRect = $layout.CtaRect
                $button = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
                $graphics.FillRectangle($button, [int]$ctaRect[0], [int]$ctaRect[1], [int]$ctaRect[2], [int]$ctaRect[3])
                $button.Dispose()
                $ctaFontSize = if ($size.id -eq '320x100') { 9 } elseif ($size.id -eq '728x90') { 11 } elseif ($size.id -eq '300x250') { 12 } else { 14 }
                $ctaFont = [System.Drawing.Font]::new('Arial', [single]$ctaFontSize, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
                $ctaText = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 25, 33, 41))
                $buttonRect = [System.Drawing.RectangleF]::new([single]$ctaRect[0], [single]$ctaRect[1], [single]$ctaRect[2], [single]$ctaRect[3])
                $graphics.DrawString([string]$text.cta, $ctaFont, $ctaText, $buttonRect, $smallFormat)
                $ctaText.Dispose()
                $ctaFont.Dispose()

                $quality = [System.Drawing.Imaging.EncoderParameter]::new($qualityParameter, [long]86)
                $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
                $encoderParameters.Param[0] = $quality
                $bitmap.Save($tempBackupPath, $qualityEncoder, $encoderParameters)
                $encoderParameters.Dispose()
                $quality.Dispose()
            } finally {
                $graphics.Dispose()
                $background.Dispose()
                $logo.Dispose()
                $bitmap.Dispose()
            }
            Move-Item -LiteralPath $tempBackupPath -Destination $backupPath -Force
        }
    }
}

Write-Host 'Imagens de backup completas: 180/180.'
