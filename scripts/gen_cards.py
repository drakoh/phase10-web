from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT = "/Users/remicartier/Documents/work/phase10-web/public/cards"
os.makedirs(OUT, exist_ok=True)

W, H = 200, 280
RADIUS = 18

COLORS = {
    "red": (225, 40, 40),
    "blue": (30, 80, 210),
    "yellow": (255, 215, 0),
    "green": (30, 180, 60),
}

def rounded_mask(size):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, size[0]-1, size[1]-1), radius=RADIUS, fill=255)
    return m

def gradient_bg(color):
    img = Image.new("RGB", (W, H), color)
    draw = ImageDraw.Draw(img)
    # vertical gradient darker at bottom
    r, g, b = color
    for y in range(H):
        factor = 1 - (y / H) * 0.35
        draw.line([(0, y), (W, y)], fill=(int(r*factor), int(g*factor), int(b*factor)))
    return img

def draw_card(color, label, kind, sublabel=None):
    base_color = (90, 90, 110) if kind == "skip" else COLORS.get(color, (120,120,120))
    if kind == "wild":
        base_color = COLORS.get(color, (120,120,120))
    img = gradient_bg(base_color)
    draw = ImageDraw.Draw(img)

    # pattern: subtle dots
    for x in range(0, W, 12):
        for y in range(0, H, 12):
            draw.ellipse((x, y, x+2, y+2), fill=(255,255,255,40))

    # fonts
    try:
        font_big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 96)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except Exception:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text_color = (255, 255, 255)
    if color == "yellow":
        text_color = (40, 40, 40)

    # corner indices
    draw.text((14, 10), str(label), font=font_small, fill=text_color)
    # bottom-right rotated
    draw.text((W-30, H-30), str(label), font=font_small, fill=text_color)

    # center label
    bbox = draw.textbbox((0,0), str(label), font=font_big)
    tw = bbox[2]-bbox[0]
    th = bbox[3]-bbox[1]
    draw.text(((W-tw)/2, (H-th)/2 - 10), str(label), font=font_big, fill=text_color)

    if sublabel:
        bbox2 = draw.textbbox((0,0), sublabel, font=font_sub)
        tw2 = bbox2[2]-bbox2[0]
        draw.text(((W-tw2)/2, (H-th)/2 + th - 4), sublabel, font=font_sub, fill=text_color)

    # rounded mask
    mask = rounded_mask((W, H))
    out = Image.new("RGBA", (W, H), (0,0,0,0))
    out.paste(img, (0,0), mask)
    # border
    d2 = ImageDraw.Draw(out)
    d2.rounded_rectangle((1,1,W-2,H-2), radius=RADIUS, outline=(255,255,255,180), width=2)
    return out

# number cards
for color in ["red","blue","yellow","green"]:
    for v in range(1,13):
        img = draw_card(color, v, "number")
        img.save(os.path.join(OUT, f"{v}{color[0].upper()}.png"))

# wilds
for color in ["red","blue","yellow","green"]:
    img = draw_card(color, "W", "wild", "WILD")
    img.save(os.path.join(OUT, f"W{color[0].upper()}.png"))

# skip (blue)
img = draw_card("blue", "S", "skip", "SKIP")
img.save(os.path.join(OUT, "S.png"))

# card back
back = Image.new("RGBA", (W,H), (0,0,0,0))
bd = ImageDraw.Draw(back)
# rounded rect fill
m = rounded_mask((W,H))
base = Image.new("RGB",(W,H),(40,40,80))
bb = ImageDraw.Draw(base)
for y in range(H):
    factor = 1 - (y/H)*0.3
    bb.line([(0,y),(W,y)], fill=(int(40*factor),int(40*factor),int(90*factor)))
back.paste(base,(0,0),m)
bd2 = ImageDraw.Draw(back)
bd2.rounded_rectangle((1,1,W-2,H-2), radius=RADIUS, outline=(255,255,255,180), width=2)
# pattern
for x in range(0,W,16):
    for y in range(0,H,16):
        bd2.ellipse((x,y,x+3,y+3), fill=(255,255,255,60))
# center logo
try:
    font_logo = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
except Exception:
    font_logo = ImageFont.load_default()
bbox = bd2.textbbox((0,0),"P10",font=font_logo)
tw=bbox[2]-bbox[0]; th=bbox[3]-bbox[1]
bd2.text(((W-tw)/2,(H-th)/2),"P10",font=font_logo,fill=(255,255,255,200))
back.save(os.path.join(OUT, "BACK.png"))

print("done")
