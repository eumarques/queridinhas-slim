Add-Type -AssemblyName System.Drawing

$src = "C:\Users\TIAGOM~1\AppData\Local\Temp\claude\c--Users-Tiago-Marques-Downloads-Queridinhas-Slim-SDK\9eef82d6-a20f-407f-9688-a627a514c790\images\1.jpg"
$full = [System.Drawing.Bitmap]::new($src)

# Tight manual crop of just the leaf-Q-heart mark, excluding the wordmark text below
$markRect = New-Object System.Drawing.Rectangle(888, 522, 480, 278)
$mark = New-Object System.Drawing.Bitmap($markRect.Width, $markRect.Height)
$gm = [System.Drawing.Graphics]::FromImage($mark)
$gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gm.DrawImage($full, (New-Object System.Drawing.Rectangle(0,0,$markRect.Width,$markRect.Height)), $markRect, [System.Drawing.GraphicsUnit]::Pixel)
$gm.Dispose()
$mark.Save("assets/source/logo-mark-final.png", [System.Drawing.Imaging.ImageFormat]::Png)

function New-SquareIcon {
  param([System.Drawing.Bitmap]$Source, [string]$Path, [int]$Canvas, [double]$Scale, [System.Drawing.Color]$Bg, [bool]$Transparent, [double]$BgKeyThreshold)

  $bmp = New-Object System.Drawing.Bitmap($Canvas, $Canvas)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($Transparent) { $g.Clear([System.Drawing.Color]::Transparent) } else { $g.Clear($Bg) }

  # Optionally key out near-background pixels to transparent on a working copy
  $work = $Source
  if ($Transparent) {
    $work = $Source.Clone()
    for ($y = 0; $y -lt $work.Height; $y++) {
      for ($x = 0; $x -lt $work.Width; $x++) {
        $p = $work.GetPixel($x, $y)
        $diff = [Math]::Abs([int]$p.R - 249) + [Math]::Abs([int]$p.G - 245) + [Math]::Abs([int]$p.B - 240)
        if ($diff -lt $BgKeyThreshold) {
          $work.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $p.R, $p.G, $p.B))
        }
      }
    }
  }

  $targetW = [int]($Canvas * $Scale)
  $ratio = [double]$work.Height / [double]$work.Width
  $targetH = [int]($targetW * $ratio)
  $ox = [int](($Canvas - $targetW) / 2)
  $oy = [int](($Canvas - $targetH) / 2)
  $g.DrawImage($work, $ox, $oy, $targetW, $targetH)
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  if ($Transparent) { $work.Dispose() }
}

$plum = [System.Drawing.Color]::FromArgb(255, 0xFB, 0xF6, 0xF1)

# Main store icon: solid cream background, mark fills most of the frame
New-SquareIcon -Source $mark -Path "assets/icon.png" -Canvas 1024 -Scale 0.82 -Bg $plum -Transparent $false -BgKeyThreshold 40

# Android adaptive icon foreground: transparent background, smaller scale for the safe zone
New-SquareIcon -Source $mark -Path "assets/adaptive-icon.png" -Canvas 1024 -Scale 0.6 -Bg $plum -Transparent $true -BgKeyThreshold 40

# Favicon
New-SquareIcon -Source $mark -Path "assets/favicon.png" -Canvas 196 -Scale 0.82 -Bg $plum -Transparent $false -BgKeyThreshold 40

$mark.Dispose(); $full.Dispose()
Write-Output "Icons generated from logo mark."
