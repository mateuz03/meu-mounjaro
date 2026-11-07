from PIL import Image, ImageDraw
import os

OUT = r"C:\Users\mateu\.verdent\verdent-projects\crie-um-app-voltada\playstore"

TEAL_DEEP = (13, 148, 136)
TEAL_BRIGHT = (45, 212, 191)
TEAL_DARKER = (10, 110, 103)
WHITE = (255, 255, 255)

SIZE = 1024


def diag_gradient(size, c1, c2):
    """Gradiente diagonal suave (escura no topo-esq -> clara na base-dir)."""
    small = 128
    img = Image.new("RGB", (small, small))
    d = ImageDraw.Draw(img)
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            d.point((x, y), fill=(r, g, b))
    return img.resize((size, size), Image.BICUBIC)


def draw_rounded_m(draw, bbox, fill):
    x, y, x2, y2 = bbox
    w = x2 - x
    h = y2 - y
    stroke = int(w * 0.22)
    cap = stroke // 2
    p1 = (x + stroke // 2, y2)
    p2 = (x + stroke // 2, y + h * 0.12)
    p3 = (x + w // 2, y + h * 0.55)
    p4 = (x2 - stroke // 2, y + h * 0.12)
    p5 = (x2 - stroke // 2, y2)
    for a, b in [(p1, p2), (p2, p3), (p3, p4), (p4, p5)]:
        draw.line([a, b], fill=fill, width=stroke)
        for pt in (a, b):
            draw.ellipse([pt[0] - cap, pt[1] - cap, pt[0] + cap, pt[1] + cap], fill=fill)


def glow_dot(layer, center, radius, color, steps=6):
    """Ponto com brilho: círculos concêntricos translúcidos."""
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for i in range(steps, 0, -1):
        r = radius + i * 14
        alpha = int(70 / i)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (255,))


# ============ VARIANTE A: "Evolução" ============
# M branco + linha de gráfico com ponto brilhante atrás + gota
def variant_a():
    icon = diag_gradient(SIZE, TEAL_DARKER, TEAL_BRIGHT).convert("RGBA")

    # círculos suaves de profundidade
    deco = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)
    d.ellipse([-250, -250, 350, 350], fill=(255, 255, 255, 22))
    d.ellipse([750, 700, 1400, 1350], fill=(255, 255, 255, 26))
    d.ellipse([680, -180, 1180, 320], fill=(255, 255, 255, 16))
    icon = Image.alpha_composite(icon, deco)

    # linha de gráfico (polilinha) atrás do M
    chart = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(chart)
    pts = [(90, 700), (280, 560), (430, 660), (620, 420), (800, 480), (930, 250)]
    stroke = 26
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=(255, 255, 255, 120), width=stroke)
        cap = stroke // 2
        for pt in (pts[i], pts[i + 1]):
            d.ellipse([pt[0] - cap, pt[1] - cap, pt[0] + cap, pt[1] + cap], fill=(255, 255, 255, 120))
    icon = Image.alpha_composite(icon, chart)

    # ponto brilhante na ponta da linha
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_dot(glow, (930, 250), 20, WHITE)
    icon = Image.alpha_composite(icon, glow)

    # M principal
    d = ImageDraw.Draw(icon)
    draw_rounded_m(d, (240, 300, 790, 790), WHITE)

    # gota accent (topo direita)
    drop = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(drop)
    cx, cy, r = 810, 220, 52
    d.polygon([(cx, cy - r - 46), (cx + int(r * 0.92), cy), (cx, cy + r), (cx - int(r * 0.92), cy)], fill=WHITE + (255,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE + (255,))
    # brilho interno da gota (recorte teal translúcido)
    d.ellipse([cx - r + 14, cy - r + 22, cx - 6, cy - 2], fill=TEAL_BRIGHT + (160,))
    icon = Image.alpha_composite(icon, drop)

    return icon


# ============ VARIANTE B: "Pulso" ============
# Arcos concêntricos emanando do M (ondas/pulso de vida)
def variant_b():
    icon = diag_gradient(SIZE, TEAL_DARKER, TEAL_BRIGHT).convert("RGBA")

    # arcos concêntricos translúcidos a partir do centro
    arcs = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(arcs)
    cx, cy = SIZE // 2, SIZE // 2 + 30
    for i, r in enumerate(range(230, 620, 90)):
        alpha = 70 - i * 10
        wdt = 34 - i * 4
        d.arc([cx - r, cy - r, cx + r, cy + r], start=200, end=340,
              fill=(255, 255, 255, max(alpha, 18)), width=wdt)
    icon = Image.alpha_composite(icon, arcs)

    # círculo de fundo atrás do M (disco suave)
    disc = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(disc)
    d.ellipse([cx - 235, cy - 235, cx + 235, cy + 235], fill=(255, 255, 255, 36))
    icon = Image.alpha_composite(icon, disc)

    # M
    d = ImageDraw.Draw(icon)
    draw_rounded_m(d, (cx - 260, cy - 240, cx + 260, cy + 250), WHITE)
    return icon


# ============ VARIANTE C: "Gota" ============
# Gota grande branca com o M em teal dentro
def variant_c():
    icon = diag_gradient(SIZE, TEAL_DEEP, TEAL_BRIGHT).convert("RGBA")

    # círculos de profundidade
    deco = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)
    d.ellipse([-200, 600, 400, 1200], fill=(255, 255, 255, 20))
    d.ellipse([700, -220, 1250, 330], fill=(255, 255, 255, 22))
    icon = Image.alpha_composite(icon, deco)

    # gota grande branca
    drop = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(drop)
    cx, cy, r = SIZE // 2, 560, 300
    tip = (cx, 130)
    d.polygon([tip, (cx + int(r * 0.99), cy), (cx, cy + r), (cx - int(r * 0.99), cy)], fill=WHITE + (255,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE + (255,))
    icon = Image.alpha_composite(icon, drop)

    # brilho interno da gota (arco teal translúcido)
    shine = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(shine)
    d.ellipse([cx - r + 40, cy - r + 60, cx - 40, cy - 20], fill=TEAL_BRIGHT + (110,))
    icon = Image.alpha_composite(icon, shine)

    # M em teal dentro da gota
    d = ImageDraw.Draw(icon)
    draw_rounded_m(d, (cx - 170, 430, cx + 170, 740), TEAL_DEEP)
    return icon


a = variant_a()
b = variant_b()
c = variant_c()

a.save(os.path.join(OUT, "logo-v2-a-evolucao.png"))
b.save(os.path.join(OUT, "logo-v2-b-pulso.png"))
c.save(os.path.join(OUT, "logo-v2-c-gota.png"))

# folha de contato: 3 lado a lado
sheet = Image.new("RGB", (SIZE * 3 + 80, SIZE + 40), (250, 250, 250))
sheet.paste(a.convert("RGB"), (20, 20))
sheet.paste(b.convert("RGB"), (SIZE + 40, 20))
sheet.paste(c.convert("RGB"), (SIZE * 2 + 60, 20))
sheet.save(os.path.join(OUT, "logo-v2-preview.png"))

print("DONE")
