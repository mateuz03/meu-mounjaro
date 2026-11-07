from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(r"C:\Users\mateu\.verdent\verdent-projects\crie-um-app-voltada")
SOURCE = Path(r"C:\Users\mateu\.verdent\storage\profiles\prod-s1\workspaces\crie-um-app-voltada--proj_8f677cbcb8f44147\shared\blobs\sha256\06\35\0635d6f8d638fd0d7e94700972e8b84ed7bf61a3a99905bc8ed8f011cabc9109")
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
PWA_DIR = ROOT / "public" / "icons"

image = Image.open(SOURCE).convert("RGBA")
print(f"Input image: {image.width}x{image.height}, {image.mode}")

# Normalize to square without stretching, keeping the user's artwork intact.
icon = ImageOps.fit(image, (1024, 1024), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
icon.save(ROOT / "playstore" / "logo-icon-1024.png")

# Android legacy launcher icons.
launcher_sizes = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
for folder, size in launcher_sizes.items():
    target = ANDROID_RES / folder
    target.mkdir(parents=True, exist_ok=True)
    resized = icon.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(target / "ic_launcher.png")
    resized.save(target / "ic_launcher_round.png")

# Adaptive icon layers: artwork is inset by the existing Android XML; use a matching solid surround.
adaptive_sizes = {
    "mipmap-ldpi": 81,
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
background = (8, 48, 69, 255)
for folder, size in adaptive_sizes.items():
    target = ANDROID_RES / folder
    foreground = icon.resize((size, size), Image.Resampling.LANCZOS)
    foreground.save(target / "ic_launcher_foreground.png")
    Image.new("RGBA", (size, size), background).save(target / "ic_launcher_background.png")

# PWA and Apple touch icons.
for filename, size in {
    "icon-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
    "icon-maskable-512.png": 512,
    "icon-maskable-192.png": 192,
}.items():
    icon.resize((size, size), Image.Resampling.LANCZOS).save(PWA_DIR / filename)

print("Android launcher/adaptive icons and PWA icons updated.")
