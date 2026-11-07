Add-Type -AssemblyName System.Drawing

$w = 1024; $h = 500
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# background gradient: navy (left) -> teal (right)
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
    [System.Drawing.Color]::FromArgb(15, 42, 61),
    [System.Drawing.Color]::FromArgb(13, 148, 136),
    0.0)
$g.FillRectangle($brush, $rect)

# subtle decorative circles
$penSoft = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28, 255, 255, 255), 2)
$g.DrawEllipse($penSoft, 760, -140, 420, 420)
$g.DrawEllipse($penSoft, 860, -60, 300, 300)
$g.DrawEllipse($penSoft, -120, 340, 300, 300)

# title
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 64, [System.Drawing.FontStyle]::Bold)
$white = [System.Drawing.Brushes]::White
$title = "Meu Mounjaro"
$szT = $g.MeasureString($title, $fontTitle)
$g.DrawString($title, $fontTitle, $white, ($w - $szT.Width) / 2, 168)

# subtitle
$fontSub = New-Object System.Drawing.Font("Segoe UI", 26)
$tealLight = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(153, 246, 228))
$sub = "Di" + [char]0xE1 + "rio pessoal de acompanhamento"
$szS = $g.MeasureString($sub, $fontSub)
$g.DrawString($sub, $fontSub, $tealLight, ($w - $szS.Width) / 2, 280)

$g.Dispose()
$out = "C:\Users\mateu\.verdent\verdent-projects\crie-um-app-voltada\playstore\feature-graphic.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "OK $out"
