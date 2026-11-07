from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = r"C:\Users\mateu\.verdent\verdent-projects\crie-um-app-voltada\playstore"
os.makedirs(OUT_DIR, exist_ok=True)

# Cores
TEAL_TOP = (13, 148, 136)
TEAL_BOTTOM = (45, 212, 191)
WHITE = (255, 255, 255)
NAVY = (18, 48, 71)
TEAL_LIGHT = (20, 184, 166)

def gradient(size, c1, c2):
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    w, h = size
    for y in range(h):
        r = int(c1[0] + (c2[0] - c1[0]) * y / h)
        g = int(c1[1] + (c2[1] - c1[1]) * y / h)
        b = int(c1[2] + (c2[2] - c1[2]) * y / h)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img

def draw_rounded_m(draw, bbox, fill):
    """Desenha um M geométrico com cantos arredondados dentro de bbox."""
    x, y, x2, y2 = bbox
    w = x2 - x
    h = y2 - y
    stroke = int(w * 0.22)
    cap = stroke // 2

    # Pontos do M (4 pontos de base + topo do V central)
    p1 = (x + stroke//2, y2)          # base esquerda
    p2 = (x + stroke//2, y + h*0.12)  # topo esquerdo
    p3 = (x + w//2, y + h*0.55)       # centro inferior (V)
    p4 = (x2 - stroke//2, y + h*0.12) # topo direito
    p5 = (x2 - stroke//2, y2)         # base direita

    # Desenha linhas grossas com pontas arredondadas usando linhas + círculos
    for a, b in [(p1, p2), (p2, p3), (p3, p4), (p4, p5)]:
        draw.line([a, b], fill=fill, width=stroke)
        draw.ellipse([a[0]-cap, a[1]-cap, a[0]+cap, a[1]+cap], fill=fill)
        draw.ellipse([b[0]-cap, b[1]-cap, b[0]+cap, b[1]+cap], fill=fill)

# 1. Ícone 1024x1024 full-bleed
icon = gradient((1024, 1024), TEAL_TOP, TEAL_BOTTOM)
draw = ImageDraw.Draw(icon)
margin = 220
draw_rounded_m(draw, (margin, margin, 1024-margin, 1024-margin), WHITE)
icon.save(os.path.join(OUT_DIR, "logo-icon-1024.png"))
print("logo-icon-1024.png")

# 2. Ícone 512x512
icon512 = gradient((512, 512), TEAL_TOP, TEAL_BOTTOM)
draw = ImageDraw.Draw(icon512)
margin = 110
draw_rounded_m(draw, (margin, margin, 512-margin, 512-margin), WHITE)
icon512.save(os.path.join(OUT_DIR, "logo-icon-512.png"))
print("logo-icon-512.png")

# 3. Logo horizontal 1536x512
logo = Image.new("RGB", (1536, 512), (255, 255, 255))
draw = ImageDraw.Draw(logo)

# Ícone à esquerda
icon_w = 300
icon_h = 300
icon_x = 140
icon_y = (512 - icon_h) // 2
icon_small = gradient((icon_w, icon_h), TEAL_TOP, TEAL_BOTTOM)
draw_icon = ImageDraw.Draw(icon_small)
margin_s = 65
draw_rounded_m(draw_icon, (margin_s, margin_s, icon_w-margin_s, icon_h-margin_s), WHITE)
logo.paste(icon_small, (icon_x, icon_y))

# Texto
try:
    font_title = ImageFont.truetype("segoeuib.ttf", 110)
    font_sub = ImageFont.truetype("segoeui.ttf", 44)
except:
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 110)
        font_sub = ImageFont.truetype("arial.ttf", 44)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

text_x = icon_x + icon_w + 70
draw.text((text_x, 160), "Meu Mounjaro", fill=NAVY, font=font_title)
draw.text((text_x, 290), "Diário pessoal de acompanhamento", fill=TEAL_LIGHT, font=font_sub)

logo.save(os.path.join(OUT_DIR, "logo-horizontal.png"))
print("logo-horizontal.png")

print("DONE")
