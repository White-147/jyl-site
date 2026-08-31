# 为 jyl-site 各预览页生成 apple-touch-icon.png (180x180) 与缺失的 favicon（请在 pwsh 中运行）
# 说明：变量名不得与参数量名大小写重复（PowerShell 变量大小写不敏感）。
Add-Type -AssemblyName System.Drawing
$root = 'D:\code\jyl-site\public\preview'
$assetsDir = 'D:\code\jyl-site\scripts\assets'

function New-ContainIcon {
  param([string]$SourcePath, [string]$OutPath, [int]$Size = 180)
  $img = [System.Drawing.Image]::FromFile($SourcePath)
  if ($null -eq $img) { throw "cannot load source: $SourcePath" }
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $scale = [Math]::Min($Size / [double]$img.Width, $Size / [double]$img.Height)
  $w = [int][Math]::Round($img.Width * $scale)
  $h = [int][Math]::Round($img.Height * $scale)
  $x = [int](($Size - $w) / 2)
  $y = [int](($Size - $h) / 2)
  $g.DrawImage($img, $x, $y, $w, $h)
  $g.Dispose()
  $img.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "generated: $OutPath"
}

# SylabAI：从 韶远（Accela）完整锁标的渲染图上裁剪左侧徽标（svg x[0,34] y[0,34.6]，10x → 340x346）
function New-SylabIcon {
  param([string]$OutPath, [int]$Size = 180)
  $render = [System.Drawing.Bitmap]::FromFile((Join-Path $assetsDir 'shoayuan-emblem.png'))
  $cropW = 340; $cropH = 346; $side = 356
  $big = New-Object System.Drawing.Bitmap($side, $side)
  $g = [System.Drawing.Graphics]::FromImage($big)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($render, [System.Drawing.Rectangle]::new([int](($side - $cropW) / 2), 0, $cropW, $cropH), [System.Drawing.Rectangle]::new(0, 0, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $render.Dispose()
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g2 = [System.Drawing.Graphics]::FromImage($bmp)
  $g2.Clear([System.Drawing.Color]::White)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($big, 0, 0, $Size, $Size)
  $g2.Dispose()
  $big.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "generated: $OutPath"
}

New-ContainIcon -SourcePath "$root\milu-studio\brand\logo.png" -OutPath "$root\milu-studio\apple-touch-icon.png"
New-ContainIcon -SourcePath "$root\milu-assistant-web\logo.png" -OutPath "$root\milu-assistant-web\apple-touch-icon.png"
New-ContainIcon -SourcePath "$root\book-recommendation\img\logo.80aea0bc.png" -OutPath "$root\book-recommendation\apple-touch-icon.png"
New-ContainIcon -SourcePath "$root\xiao-lou-ai\chuangjing-logo-shell.png" -OutPath "$root\xiao-lou-ai\apple-touch-icon.png"
New-SylabIcon -OutPath "$root\sylab-ai\apple-touch-icon.png"
New-SylabIcon -OutPath "$root\sylab-ai\favicon-32.png" -Size 32
