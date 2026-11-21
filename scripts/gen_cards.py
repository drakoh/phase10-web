from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/Users/remicartier/Documents/work/phase10-web/public/cards"
os.makedirs(OUT, exist_ok=True)

W, H = 400, 560
RADIUS = 24

COLORS = {
    "red": (225, 40, 40),
    "blue": (30, 80, 210),
    "yellow": (255, 215, 0),
    "green": (30, 180, 60),
}

SYMBOLS = {"red": "circle", "blue": "square", "yellow": "diamond", "green": "triangle"}

def rounded_mask(size):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, size[0]-1, size[1]-1), radius=RADIUS, fill=255)
    return m

def gradient_bg(color):
    img = Image.new("RGBA", (W, H), color)
    draw = ImageDraw.Draw(img)
    r, g, b = color
    for y in range(H):
        factor = 1 - (y / H) * 0.35
        draw.line([(0, y), (W, y)], fill=(int(r*factor), int(g*factor), int(b*factor)))
    # highlight
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    for rad in range(160, 0, -2):
        a = int(35 * (1 - rad / 160))
        hld.ellipse((-60, -60, rad + 60, rad + 60), fill=(255, 255, 255, a))
    img = Image.alpha_composite(img.convert("RGBA"), hl)
    return img

def draw_card(color, label, kind, sublabel=None):
    base_color = (90, 90, 110) if kind == "skip" else COLORS.get(color, (120, 120, 120))
    if kind == "wild":
        base_color = COLORS.get(color, (120, 120, 120))
    img = gradient_bg(base_color)
    draw = ImageDraw.Draw(img)

    try:
        font_big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 208)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 52)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    except Exception:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text_color = (255, 255, 255)
    if color == "yellow":
        text_color = (30, 30, 30)

    bbox = draw.textbbox((0, 0), str(label), font=font_big)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    cx = (W - tw) / 2
    cy = (H - th) / 2 - 20
    # shadow
    draw.text((cx + 4, cy + 4), str(label), font=font_big, fill=(0, 0, 0, 130))
    draw.text((cx, cy), str(label), font=font_big, fill=text_color)

    # corner indices
    draw.text((24, 16), str(label), font=font_small, fill=text_color)
    draw.text((W - 60, H - 68), str(label), font=font_small, fill=text_color)

    if sublabel:
        bbox2 = draw.textbbox((0, 0), sublabel, font=font_sub)
        tw2 = bbox2[2] - bbox2[0]
        draw.text(((W - tw2) / 2, (H - th) / 2 + th - 8), sublabel, font=font_sub, fill=text_color)

    # colorblind symbol (bottom-left)
    sym = SYMBOLS.get(color)
    sx, sy = 28, H - 52
    if sym == "circle":
        draw.ellipse((sx, sy, sx + 28, sy + 28), outline=text_color, width=3)
    elif sym == "square":
        draw.rectangle((sx, sy, sx + 28, sy + 28), outline=text_color, width=3)
    elif sym == "diamond":
        draw.polygon([(sx + 14, sy), (sx + 28, sy + 14), (sx + 14, sy + 28), (sx, sy + 14)], outline=text_color, width=3)
    elif sym == "triangle":
        draw.polygon([(sx + 14, sy), (sx + 28, sy + 28), (sx, sy + 28)], outline=text_color, width=3)

    mask = rounded_mask((W, H))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(img.convert("RGB"), (0, 0), mask)
    d2 = ImageDraw.Draw(out)
    d2.rounded_rectangle((1, 1, W - 2, H - 2), radius=RADIUS, outline=(255, 255, 255, 210), width=2)
    d2.rounded_rectangle((8, 8, W - 9, H - 9), radius=RADIUS - 4, outline=(255, 255, 255, 70), width=1)
    return out

# number cards
for color in ["red", "blue", "yellow", "green"]:
    for v in range(1, 13):
        img = draw_card(color, v, "number")
        img.save(os.path.join(OUT, f"{v}{color[0].upper()}.png"))

# wilds
for color in ["red", "blue", "yellow", "green"]:
    img = draw_card(color, "W", "wild", "WILD")
    img.save(os.path.join(OUT, f"W{color[0].upper()}.png"))

# skip
img = draw_card("blue", "S", "skip", "SKIP")
img.save(os.path.join(OUT, "S.png"))

# card back
back = Image.new("RGBA", (W, H), (0, 0, 0, 0))
m = rounded_mask((W, H))
base = Image.new("RGB", (W, H), (25, 20, 60))
bb = ImageDraw.Draw(base)
for i in range(-H, W + H, 20):
    bb.line([(i, 0), (i + H, H)], fill=(60, 50, 110), width=12)
for r in range(80, 0, -1):
    bb.ellipse((W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r), fill=(40, 30, 90))
back.paste(base, (0, 0), m)
bd2 = ImageDraw.Draw(back)
bd2.rounded_rectangle((1, 1, W - 2, H - 2), radius=RADIUS, outline=(255, 215, 0, 230), width=3)
bd2.rounded_rectangle((10, 10, W - 11, H - 11), radius=RADIUS - 4, outline=(255, 255, 255, 90), width=1)
try:
    font_logo = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 128)
    font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
except Exception:
    font_logo = ImageFont.load_default()
    font_sub = ImageFont.load_default()
bbox = bd2.textbbox((0, 0), "P10", font=font_logo)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
bd2.text(((W - tw) / 2, (H - th) / 2), "P10", font=font_logo, fill=(255, 215, 0, 240))
sub = "PHASE 10"
bbox2 = bd2.textbbox((0, 0), sub, font=font_sub)
tw2 = bbox2[2] - bbox2[0]
bd2.text(((W - tw2) / 2, (H - th) / 2 + th + 8), sub, font=font_sub, fill=(255, 255, 255, 180))
back.save(os.path.join(OUT, "BACK.png"))

print("done")
