from PIL import Image, ImageDraw, ImageFont
import os
OUT="/Users/remicartier/Documents/work/phase10-web/public"
os.makedirs(OUT+"/icons", exist_ok=True)

def make(size):
    img = Image.new("RGBA",(size,size),(0,0,0,0))
    d = ImageDraw.Draw(img)
    # rounded rect background gradient
    for y in range(size):
        t = y/size
        r = int(30 + (80-30)*t)
        g = int(40 + (60-40)*t)
        b = int(120 + (200-120)*t)
        d.line([(0,y),(size,y)], fill=(r,g,b,255))
    # mask rounded
    mask = Image.new("L",(size,size),0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0,0,size-1,size-1), radius=size//6, fill=255)
    out = Image.new("RGBA",(size,size),(0,0,0,0))
    out.paste(img,(0,0),mask)
    dd = ImageDraw.Draw(out)
    dd.rounded_rectangle((2,2,size-3,size-3), radius=size//6, outline=(255,215,0,200), width=max(2,size//64))
    # text
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size//3)
        font2 = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", max(12, size//8))
    except Exception:
        font = ImageFont.load_default(); font2 = font
    txt="P10"
    bbox = dd.textbbox((0,0),txt,font=font)
    tw=bbox[2]-bbox[0]; th=bbox[3]-bbox[1]
    dd.text(((size-tw)/2,(size-th)/2 - size//12), txt, font=font, fill=(255,215,0,255))
    sub="PHASE 10"
    bbox2 = dd.textbbox((0,0),sub,font=font2)
    tw2=bbox2[2]-bbox2[0]
    dd.text(((size-tw2)/2,(size-th)/2 + th + size//24), sub, font=font2, fill=(255,255,255,180))
    return out

for s in [192,512]:
    make(s).save(f"{OUT}/icons/icon-{s}.png")
make(180).save(f"{OUT}/apple-touch-icon.png")
make(64).save(f"{OUT}/favicon.png")
# favicon.ico from 32
make(32).save(f"{OUT}/favicon.ico")
print("done")
